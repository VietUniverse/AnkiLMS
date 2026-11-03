export type PrivateLearningContent = {
  topikLessons: any[];
  scriptFolderLessons: any[];
  videoDictationSources: any[];
  wordGlossary: Record<string, { vi: string; en: string; ja?: string }>;
  topicVocabulary: any[];
  curatedPractice: any[];
};

let contentPromise: Promise<PrivateLearningContent | null> | null = null;
let ththPromise: Promise<any[] | null> | null = null;

export function loadPrivateLearningContent(): Promise<PrivateLearningContent | null> {
  contentPromise ??= fetch("/api/learning-data?name=dictation-learning-content.json", { credentials: "same-origin" })
    .then(async (response) => response.ok ? await response.json() as PrivateLearningContent : null)
    .then((data) => { if (!data) contentPromise = null; return data; })
    .catch(() => { contentPromise = null; return null; });
  return contentPromise;
}

export function loadAdminThthCurriculum(): Promise<any[] | null> {
  ththPromise ??= fetch("/api/learning-data?name=thth-curriculum.json", { credentials: "same-origin" })
    .then(async (response) => response.ok ? await response.json() as any[] : null)
    .then((data) => { if (!data) ththPromise = null; return data; })
    .catch(() => { ththPromise = null; return null; });
  return ththPromise;
}
