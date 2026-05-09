export const JOB_TYPES = {
  blender_render: {
    dockerImage:    'blenderkit/headless-blender:blender-4.1',
    minVramGB:      4,
    defaultTimeLim: 7200,
    requiredParams: [],  // frameStart/frameEnd are optional — Blender uses .blend file settings by default
  },
  stable_diffusion: {
    dockerImage:    'universonic/stable-diffusion-webui:minimal',
    minVramGB:      6,
    defaultTimeLim: 300,
    requiredParams: ['prompt', 'steps', 'width', 'height'],
  },
  ffmpeg_transcode: {
    dockerImage:    'jrottenberg/ffmpeg:6.0-ubuntu1804',
    minVramGB:      2,
    defaultTimeLim: 1800,
    requiredParams: ['inputFormat', 'outputFormat'],
  },
  python_script: {
    dockerImage:    'python:3.11-slim',
    minVramGB:      0,
    defaultTimeLim: 300,
    requiredParams: [],
    description:    'Run any Python script in a clean environment',
  },
  python_gpu: {
    dockerImage:    'pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime',
    minVramGB:      0,
    defaultTimeLim: 3600,
    requiredParams: [],
    description:    'Python with PyTorch + CUDA for GPU workloads',
  },
} as const;

export type JobTypeKey = keyof typeof JOB_TYPES;
