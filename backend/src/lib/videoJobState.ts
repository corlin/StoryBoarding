export interface VideoJobState {
  jobType: string;
  status: string;
}

export function isActiveVideoJob(job: VideoJobState) {
  return job.jobType === "video" && (job.status === "submitted" || job.status === "processing");
}

export function generatedVideoTakeId(jobId: string) {
  return `video-${jobId}`;
}
