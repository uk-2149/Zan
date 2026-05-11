export const JOB_TYPES = {
  blender_render: {
    dockerImage: "linuxserver/blender:latest",
    minVramGB: 0,
    defaultTimeLim: 7200,
    requiredParams: [], // frameStart/frameEnd are optional — Blender uses .blend file settings by default
  },
  stable_diffusion: {
    dockerImage: "universonic/stable-diffusion-webui:minimal",
    minVramGB: 6,
    defaultTimeLim: 300,
    requiredParams: ["prompt", "steps", "width", "height"],
  },
  ffmpeg_transcode: {
    dockerImage: "jrottenberg/ffmpeg:6.0-ubuntu1804",
    minVramGB: 2,
    defaultTimeLim: 1800,
    requiredParams: ["inputFormat", "outputFormat"],
  },
  python_script: {
    dockerImage: "python:3.11-slim",
    minVramGB: 0,
    defaultTimeLim: 300,
    requiredParams: [],
    description: "Run any Python script in a clean environment",
  },
  python_gpu: {
    // Use a smaller Python base image for now, avoiding the large CUDA runtime image.
    // The job runner installs PyTorch / diffusers at runtime, so this is enough for CPU/MPS execution.
    dockerImage: "python:3.11-slim",
    minVramGB: 0,
    defaultTimeLim: 3600,
    requiredParams: [],
    description: "Python with PyTorch-compatible runtime for CPU/MPS workloads",
  },
} as const;

export type JobTypeKey = keyof typeof JOB_TYPES;
