export const JOB_TYPES = {
  blender_render: {
    dockerImage:    'gnet/blender:4.1',
    minVramGB:      6,
    defaultTimeLim: 7200,
    requiredParams: ['frameStart', 'frameEnd'],
  },
  stable_diffusion: {
    dockerImage:    'gnet/stable-diffusion:1.5',
    minVramGB:      6,
    defaultTimeLim: 300,
    requiredParams: ['prompt', 'steps', 'width', 'height'],
  },
  ffmpeg_transcode: {
    dockerImage:    'gnet/ffmpeg:6.0',
    minVramGB:      2,
    defaultTimeLim: 1800,
    requiredParams: ['inputFormat', 'outputFormat'],
  },
} as const;

export type JobTypeKey = keyof typeof JOB_TYPES;
