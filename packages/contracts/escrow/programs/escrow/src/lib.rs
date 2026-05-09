use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, program::invoke_signed, system_instruction};

declare_id!("G4AGRutZdKry9rMnJiZt2Noz42ifwghgZxiXCETfXHGg");

const BPS_DENOMINATOR: u16 = 10_000;
const MIN_PROVIDER_STAKE_LAMPORTS: u64 = 2_000_000_000; // 2 SOL
const CONFIG_SEED: &[u8] = b"config";
const PROVIDER_STAKE_SEED: &[u8] = b"provider_stake";
const PROVIDER_VAULT_SEED: &[u8] = b"provider_vault";
const JOB_ESCROW_SEED: &[u8] = b"job_escrow";
const JOB_VAULT_SEED: &[u8] = b"job_vault";
const PLATFORM_TREASURY_SEED: &[u8] = b"platform_treasury";

#[program]
pub mod escrow {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        authority: Pubkey,
        platform_fee_bps: u16,
        max_job_deposit_lamports: u64,
    ) -> Result<()> {
        require!(platform_fee_bps <= BPS_DENOMINATOR, EscrowError::InvalidFeeBps);
        let config = &mut ctx.accounts.config;
        config.authority = authority;
        config.platform_fee_bps = platform_fee_bps;
        config.max_job_deposit_lamports = max_job_deposit_lamports;
        config.paused = false;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn set_pause(ctx: Context<SetPause>, paused: bool) -> Result<()> {
        ctx.accounts.config.paused = paused;
        Ok(())
    }

    pub fn initialize_platform_treasury(_ctx: Context<InitializePlatformTreasury>) -> Result<()> {
        Ok(())
    }

    pub fn update_authority(ctx: Context<UpdateAuthority>, new_authority: Pubkey) -> Result<()> {
        ctx.accounts.config.authority = new_authority;
        Ok(())
    }

    pub fn initialize_provider_stake(
        ctx: Context<InitializeProviderStake>,
        initial_stake_lamports: u64,
    ) -> Result<()> {
        require!(
            initial_stake_lamports >= MIN_PROVIDER_STAKE_LAMPORTS,
            EscrowError::InsufficientInitialStake
        );
        require!(!ctx.accounts.config.paused, EscrowError::ProgramPaused);

        transfer_lamports(
            &ctx.accounts.provider.to_account_info(),
            &ctx.accounts.provider_vault.to_account_info(),
            initial_stake_lamports,
        )?;

        let provider_stake = &mut ctx.accounts.provider_stake;
        provider_stake.provider = ctx.accounts.provider.key();
        provider_stake.total_staked_lamports = initial_stake_lamports;
        provider_stake.total_slashed_lamports = 0;
        provider_stake.last_slash_at = 0;
        provider_stake.bump = ctx.bumps.provider_stake;

        emit!(ProviderStakeUpdated {
            provider: provider_stake.provider,
            total_staked_lamports: provider_stake.total_staked_lamports,
        });
        Ok(())
    }

    pub fn top_up_provider_stake(ctx: Context<TopUpProviderStake>, amount_lamports: u64) -> Result<()> {
        require!(amount_lamports > 0, EscrowError::InvalidAmount);
        require!(!ctx.accounts.config.paused, EscrowError::ProgramPaused);

        transfer_lamports(
            &ctx.accounts.provider.to_account_info(),
            &ctx.accounts.provider_vault.to_account_info(),
            amount_lamports,
        )?;

        let provider_stake = &mut ctx.accounts.provider_stake;
        provider_stake.total_staked_lamports = provider_stake
            .total_staked_lamports
            .checked_add(amount_lamports)
            .ok_or(EscrowError::ArithmeticOverflow)?;

        emit!(ProviderStakeUpdated {
            provider: provider_stake.provider,
            total_staked_lamports: provider_stake.total_staked_lamports,
        });
        Ok(())
    }

    pub fn withdraw_provider_stake(
        ctx: Context<WithdrawProviderStake>,
        amount_lamports: u64,
    ) -> Result<()> {
        require!(amount_lamports > 0, EscrowError::InvalidAmount);
        require!(!ctx.accounts.config.paused, EscrowError::ProgramPaused);

        let provider_stake = &mut ctx.accounts.provider_stake;
        let new_total = provider_stake
            .total_staked_lamports
            .checked_sub(amount_lamports)
            .ok_or(EscrowError::InsufficientStakeBalance)?;
            
        require!(
            new_total >= MIN_PROVIDER_STAKE_LAMPORTS,
            EscrowError::CannotDropBelowMinimumStake
        );

        let signer_seeds: &[&[u8]] = &[
            PROVIDER_VAULT_SEED,
            provider_stake.provider.as_ref(),
            &[ctx.bumps.provider_vault],
        ];
        transfer_lamports_signed(
            &ctx.accounts.provider_vault.to_account_info(),
            &ctx.accounts.provider.to_account_info(),
            amount_lamports,
            signer_seeds,
        )?;

        provider_stake.total_staked_lamports = new_total;

        emit!(ProviderStakeUpdated {
            provider: provider_stake.provider,
            total_staked_lamports: provider_stake.total_staked_lamports,
        });
        Ok(())
    }

    pub fn create_job_escrow(
        ctx: Context<CreateJobEscrow>,
        job_id: u64,
        deposit_lamports: u64,
    ) -> Result<()> {
        require!(deposit_lamports > 0, EscrowError::InvalidAmount);
        require!(!ctx.accounts.config.paused, EscrowError::ProgramPaused);
        require!(
            deposit_lamports <= ctx.accounts.config.max_job_deposit_lamports,
            EscrowError::ExceedsExposureCap
        );

        transfer_lamports(
            &ctx.accounts.client.to_account_info(),
            &ctx.accounts.job_vault.to_account_info(),
            deposit_lamports,
        )?;

        let escrow = &mut ctx.accounts.job_escrow;
        escrow.job_id = job_id;
        escrow.client = ctx.accounts.client.key();
        escrow.provider = None; // Assigned later
        escrow.deposit_lamports = deposit_lamports;
        escrow.settled_lamports = 0;
        escrow.status = JobStatus::Funded;
        escrow.created_at = Clock::get()?.unix_timestamp;
        escrow.completed_at = None;
        escrow.bump = ctx.bumps.job_escrow;

        emit!(JobEscrowCreated {
            job_id,
            client: escrow.client,
            deposit_lamports,
        });
        Ok(())
    }

    pub fn assign_provider_to_escrow(
        ctx: Context<AssignProviderToEscrow>,
        provider: Pubkey,
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused, EscrowError::ProgramPaused);
        
        let escrow = &mut ctx.accounts.job_escrow;
        require!(
            escrow.status == JobStatus::Funded || escrow.status == JobStatus::Assigned,
            EscrowError::InvalidJobState
        );
        
        escrow.provider = Some(provider);
        escrow.status = JobStatus::Assigned;

        emit!(JobProviderAssigned {
            job_id: escrow.job_id,
            provider,
        });
        Ok(())
    }

    pub fn settle_job(ctx: Context<SettleJob>, actual_cost_lamports: u64) -> Result<()> {
        require!(!ctx.accounts.config.paused, EscrowError::ProgramPaused);
        let escrow = &mut ctx.accounts.job_escrow;
        require!(
            escrow.status == JobStatus::Assigned || escrow.status == JobStatus::Funded,
            EscrowError::InvalidJobState
        );
        require!(
            actual_cost_lamports <= escrow.deposit_lamports,
            EscrowError::ActualCostExceedsDeposit
        );
        require!(escrow.provider.is_some(), EscrowError::ProviderNotAssigned);
        require!(
            escrow.provider.unwrap() == ctx.accounts.provider_wallet.key(),
            EscrowError::ProviderMismatch
        );

        let refund_lamports = escrow
            .deposit_lamports
            .checked_sub(actual_cost_lamports)
            .ok_or(EscrowError::ArithmeticOverflow)?;

        let platform_fee = (actual_cost_lamports as u128)
            .checked_mul(ctx.accounts.config.platform_fee_bps as u128)
            .unwrap()
            .checked_div(BPS_DENOMINATOR as u128)
            .unwrap() as u64;

        let provider_payment = actual_cost_lamports
            .checked_sub(platform_fee)
            .ok_or(EscrowError::ArithmeticOverflow)?;

        let signer_seeds: &[&[u8]] = &[
            JOB_VAULT_SEED,
            &escrow.job_id.to_le_bytes(),
            &[ctx.bumps.job_vault],
        ];

        if provider_payment > 0 {
            transfer_lamports_signed(
                &ctx.accounts.job_vault.to_account_info(),
                &ctx.accounts.provider_wallet.to_account_info(),
                provider_payment,
                signer_seeds,
            )?;
        }

        if platform_fee > 0 {
            transfer_lamports_signed(
                &ctx.accounts.job_vault.to_account_info(),
                &ctx.accounts.platform_treasury.to_account_info(),
                platform_fee,
                signer_seeds,
            )?;
        }

        if refund_lamports > 0 {
            transfer_lamports_signed(
                &ctx.accounts.job_vault.to_account_info(),
                &ctx.accounts.client_wallet.to_account_info(),
                refund_lamports,
                signer_seeds,
            )?;
        }

        escrow.status = JobStatus::Completed;
        escrow.settled_lamports = actual_cost_lamports;
        escrow.completed_at = Some(Clock::get()?.unix_timestamp);

        emit!(JobSettled {
            job_id: escrow.job_id,
            provider_paid_lamports: provider_payment,
            platform_fee_lamports: platform_fee,
            client_refund_lamports: refund_lamports,
        });
        Ok(())
    }

    pub fn refund_job(ctx: Context<RefundJob>) -> Result<()> {
        require!(!ctx.accounts.config.paused, EscrowError::ProgramPaused);
        let escrow = &mut ctx.accounts.job_escrow;
        require!(
            escrow.status == JobStatus::Funded || escrow.status == JobStatus::Assigned,
            EscrowError::InvalidJobState
        );

        let signer_seeds: &[&[u8]] = &[
            JOB_VAULT_SEED,
            &escrow.job_id.to_le_bytes(),
            &[ctx.bumps.job_vault],
        ];
        transfer_lamports_signed(
            &ctx.accounts.job_vault.to_account_info(),
            &ctx.accounts.client_wallet.to_account_info(),
            escrow.deposit_lamports,
            signer_seeds,
        )?;

        escrow.status = JobStatus::Refunded;
        escrow.settled_lamports = 0;
        escrow.completed_at = Some(Clock::get()?.unix_timestamp);

        emit!(JobRefunded {
            job_id: escrow.job_id,
            refund_lamports: escrow.deposit_lamports,
        });
        Ok(())
    }

    pub fn slash_provider_stake(
        ctx: Context<SlashProviderStake>,
        amount_lamports: u64,
        evidence_hash: [u8; 32],
        evidence_uri: String,
        job_id: u64,
    ) -> Result<()> {
        require!(amount_lamports > 0, EscrowError::InvalidAmount);
        let provider_stake = &mut ctx.accounts.provider_stake;

        provider_stake.total_staked_lamports = provider_stake
            .total_staked_lamports
            .checked_sub(amount_lamports)
            .ok_or(EscrowError::InsufficientStakeBalance)?;
            
        provider_stake.total_slashed_lamports = provider_stake
            .total_slashed_lamports
            .checked_add(amount_lamports)
            .ok_or(EscrowError::ArithmeticOverflow)?;
            
        provider_stake.last_slash_at = Clock::get()?.unix_timestamp;

        let signer_seeds: &[&[u8]] = &[
            PROVIDER_VAULT_SEED,
            provider_stake.provider.as_ref(),
            &[ctx.bumps.provider_vault],
        ];
        
        transfer_lamports_signed(
            &ctx.accounts.provider_vault.to_account_info(),
            &ctx.accounts.platform_treasury.to_account_info(),
            amount_lamports,
            signer_seeds,
        )?;

        emit!(ProviderSlashed {
            provider: provider_stake.provider,
            amount_lamports,
            remaining_stake_lamports: provider_stake.total_staked_lamports,
            evidence_hash,
            evidence_uri,
            job_id,
        });
        Ok(())
    }

    pub fn close_job_escrow(ctx: Context<CloseJobEscrow>) -> Result<()> {
        let escrow = &ctx.accounts.job_escrow;
        require!(
            escrow.status == JobStatus::Completed || escrow.status == JobStatus::Refunded,
            EscrowError::InvalidJobState
        );
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum JobStatus {
    Funded,
    Completed,
    Refunded,
    Cancelled,
    Assigned,
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub platform_fee_bps: u16,
    pub max_job_deposit_lamports: u64,
    pub paused: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ProviderStake {
    pub provider: Pubkey,
    pub total_staked_lamports: u64,
    pub total_slashed_lamports: u64,
    pub last_slash_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct JobEscrow {
    pub job_id: u64,
    pub client: Pubkey,
    pub provider: Option<Pubkey>,
    pub deposit_lamports: u64,
    pub settled_lamports: u64,
    pub status: JobStatus,
    pub created_at: i64,
    pub completed_at: Option<i64>,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        seeds = [CONFIG_SEED],
        bump,
        space = 8 + Config::INIT_SPACE
    )]
    pub config: Account<'info, Config>,
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [PLATFORM_TREASURY_SEED],
        bump,
        space = 0,
        owner = system_program.key()
    )]
    /// CHECK: Treasury PDA only holds SOL; it is system-owned and has no data.
    pub platform_treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializePlatformTreasury<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, Config>,
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [PLATFORM_TREASURY_SEED],
        bump,
        space = 0,
        owner = system_program.key()
    )]
    /// CHECK: Treasury PDA only holds SOL; it is system-owned and has no data.
    pub platform_treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetPause<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
pub struct UpdateAuthority<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
pub struct InitializeProviderStake<'info> {
    #[account(mut)]
    pub provider: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = provider,
        seeds = [PROVIDER_STAKE_SEED, provider.key().as_ref()],
        bump,
        space = 8 + ProviderStake::INIT_SPACE
    )]
    pub provider_stake: Account<'info, ProviderStake>,
    #[account(
        mut,
        seeds = [PROVIDER_VAULT_SEED, provider.key().as_ref()],
        bump
    )]
    /// CHECK: PDA vault for SOL. Seeds + program signer guarantees safety.
    pub provider_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TopUpProviderStake<'info> {
    #[account(mut)]
    pub provider: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [PROVIDER_STAKE_SEED, provider.key().as_ref()],
        bump = provider_stake.bump,
        has_one = provider
    )]
    pub provider_stake: Account<'info, ProviderStake>,
    #[account(
        mut,
        seeds = [PROVIDER_VAULT_SEED, provider.key().as_ref()],
        bump
    )]
    /// CHECK: PDA vault for SOL. Seeds + program signer guarantees safety.
    pub provider_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawProviderStake<'info> {
    #[account(mut)]
    pub provider: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [PROVIDER_STAKE_SEED, provider.key().as_ref()],
        bump = provider_stake.bump,
        has_one = provider
    )]
    pub provider_stake: Account<'info, ProviderStake>,
    #[account(
        mut,
        seeds = [PROVIDER_VAULT_SEED, provider.key().as_ref()],
        bump
    )]
    /// CHECK: PDA vault for SOL. Seeds + program signer guarantees safety.
    pub provider_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(job_id: u64)]
pub struct CreateJobEscrow<'info> {
    #[account(mut)]
    pub client: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = client,
        seeds = [JOB_ESCROW_SEED, &job_id.to_le_bytes()],
        bump,
        space = 8 + JobEscrow::INIT_SPACE
    )]
    pub job_escrow: Account<'info, JobEscrow>,
    #[account(
        mut,
        seeds = [JOB_VAULT_SEED, &job_id.to_le_bytes()],
        bump
    )]
    /// CHECK: PDA vault for SOL. Seeds + program signer guarantees safety.
    pub job_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AssignProviderToEscrow<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [JOB_ESCROW_SEED, &job_escrow.job_id.to_le_bytes()],
        bump = job_escrow.bump
    )]
    pub job_escrow: Account<'info, JobEscrow>,
}

#[derive(Accounts)]
pub struct SettleJob<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [JOB_ESCROW_SEED, &job_escrow.job_id.to_le_bytes()], bump = job_escrow.bump)]
    pub job_escrow: Account<'info, JobEscrow>,
    #[account(mut, seeds = [JOB_VAULT_SEED, &job_escrow.job_id.to_le_bytes()], bump)]
    /// CHECK: PDA vault for SOL. Seeds + program signer guarantees safety.
    pub job_vault: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Validated inside instruction
    pub provider_wallet: SystemAccount<'info>,
    #[account(mut, address = job_escrow.client)]
    pub client_wallet: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [PLATFORM_TREASURY_SEED],
        bump
    )]
    /// CHECK: Treasury PDA
    pub platform_treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RefundJob<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [JOB_ESCROW_SEED, &job_escrow.job_id.to_le_bytes()], bump = job_escrow.bump)]
    pub job_escrow: Account<'info, JobEscrow>,
    #[account(mut, seeds = [JOB_VAULT_SEED, &job_escrow.job_id.to_le_bytes()], bump)]
    /// CHECK: PDA vault for SOL. Seeds + program signer guarantees safety.
    pub job_vault: UncheckedAccount<'info>,
    #[account(mut, address = job_escrow.client)]
    pub client_wallet: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SlashProviderStake<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, Config>,
    #[account(mut, has_one = provider)]
    pub provider_stake: Account<'info, ProviderStake>,
    /// CHECK: provider key is validated by provider_stake.has_one(provider)
    pub provider: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [PROVIDER_VAULT_SEED, provider.key().as_ref()],
        bump
    )]
    /// CHECK: PDA vault for SOL. Seeds + program signer guarantees safety.
    pub provider_vault: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [PLATFORM_TREASURY_SEED],
        bump
    )]
    /// CHECK: Treasury PDA
    pub platform_treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseJobEscrow<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [JOB_ESCROW_SEED, &job_escrow.job_id.to_le_bytes()],
        bump = job_escrow.bump,
        close = authority
    )]
    pub job_escrow: Account<'info, JobEscrow>,
}

#[event]
pub struct ProviderStakeUpdated {
    pub provider: Pubkey,
    pub total_staked_lamports: u64,
}

#[event]
pub struct ProviderSlashed {
    pub provider: Pubkey,
    pub amount_lamports: u64,
    pub remaining_stake_lamports: u64,
    pub evidence_hash: [u8; 32],
    pub evidence_uri: String,
    pub job_id: u64,
}

#[event]
pub struct JobEscrowCreated {
    pub job_id: u64,
    pub client: Pubkey,
    pub deposit_lamports: u64,
}

#[event]
pub struct JobProviderAssigned {
    pub job_id: u64,
    pub provider: Pubkey,
}

#[event]
pub struct JobSettled {
    pub job_id: u64,
    pub provider_paid_lamports: u64,
    pub platform_fee_lamports: u64,
    pub client_refund_lamports: u64,
}

#[event]
pub struct JobRefunded {
    pub job_id: u64,
    pub refund_lamports: u64,
}

#[error_code]
pub enum EscrowError {
    #[msg("Invalid platform fee bps")]
    InvalidFeeBps,
    #[msg("Program is paused")]
    ProgramPaused,
    #[msg("Initial provider stake is below minimum (2 SOL)")]
    InsufficientInitialStake,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Insufficient provider stake balance")]
    InsufficientStakeBalance,
    #[msg("Cannot withdraw below minimum required stake")]
    CannotDropBelowMinimumStake,
    #[msg("Provider account does not match provider stake account")]
    ProviderMismatch,
    #[msg("Job is not in the expected state for this operation")]
    InvalidJobState,
    #[msg("Actual settlement cost exceeds deposited amount")]
    ActualCostExceedsDeposit,
    #[msg("Job deposit exceeds max exposure cap")]
    ExceedsExposureCap,
    #[msg("Provider not yet assigned to this job")]
    ProviderNotAssigned,
}

fn transfer_lamports<'info>(
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    invoke(
        &system_instruction::transfer(from.key, to.key, amount),
        &[from.clone(), to.clone()],
    )
    .map_err(Into::into)
}

fn transfer_lamports_signed<'info>(
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    amount: u64,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    invoke_signed(
        &system_instruction::transfer(from.key, to.key, amount),
        &[from.clone(), to.clone()],
        &[signer_seeds],
    )
    .map_err(Into::into)
}
