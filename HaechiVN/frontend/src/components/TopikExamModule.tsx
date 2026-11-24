"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TOPIK_QUESTION_BANK, TopikQuestion } from "../data/topikQuestionBank";
import { TOPIK_I_FILL_BLANK_EXAMS } from "../data/topikFillBlankExams";
import writingBankRaw from "../data/topikWritingBank.json";
import officialPapersRaw from "../data/topikOfficialPapers.json";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Headphones,
  ListChecks,
  Pencil,
  RotateCcw,
  Volume2,
  XCircle,
} from "lucide-react";
import { ApiClient } from "../lib/apiClient";

type ExamSet = {
  id: string;
  title: string;
  subtitle: string;
  section: string;
  icon: React.ElementType;
  duration: number;
  questions: TopikQuestion[];
  instruction?: string;
};

type WritingItem = {
  id: number;
  questionNo: number;
  category: string;
  topic: string;
  promptText: string;
  modelAnswers: string[];
  views: number;
};

type OfficialPaper = {
  round: number;
  level: string;
  type: string;
  format: string;
  file: string;
  sizeMb: number;
};

const WRITING_BANK = writingBankRaw as WritingItem[];
const OFFICIAL_PAPERS = officialPapersRaw as OfficialPaper[];

const QUESTION_GROUPS: Omit<ExamSet, "questions">[] = [
  { id: "mini", title: "Bộ luyện tổng hợp", subtitle: "Đọc · nghe · từ vựng và ngữ pháp", section: "all", icon: BookOpen, duration: 15 },
  { id: "listening", title: "Luyện nghe", subtitle: "Nghe hội thoại, chọn đáp án", section: "listening", icon: Headphones, duration: 5 },
  { id: "reading", title: "Luyện đọc", subtitle: "Đọc hiểu và tìm thông tin", section: "reading", icon: BookOpen, duration: 10 },
  { id: "grammar", title: "Từ vựng & ngữ pháp", subtitle: "220+ câu trắc nghiệm ngữ pháp & từ vựng", section: "grammar", icon: ListChecks, duration: 15 },
];

const OFFICIAL_EXAM_SESSIONS = [
  { round: 102, year: 2025 },
  { round: 96, year: 2024 },
  { round: 91, year: 2023 },
  { round: 83, year: 2022 },
  { round: 64, year: 2019 },
  { round: 60, year: 2018 },
  { round: 52, year: 2017 },
  { round: 47, year: 2016 },
  { round: 41, year: 2015 },
  { round: 37, year: 2014 },
  { round: 36, year: 2014 },
  { round: 35, year: 2014 },
];

type TopikExamModuleProps = {
  /** Mở thẳng một bộ luyện (dùng cho trang riêng /topik/grammar). */
  initialSetId?: string;
  /** Rời khỏi bài luyện thì điều hướng đi đâu (mặc định: ở lại trang). */
  onExit?: () => void;
};

export const TopikExamModule: React.FC<TopikExamModuleProps> = ({ initialSetId, onExit }) => {
  const [levelTab, setLevelTab] = useState<"I" | "II" | "writing" | "papers">("I");
  const [activeSet, setActiveSet] = useState<ExamSet | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [showQuestionMap, setShowQuestionMap] = useState(false);
  const submittedRef = useRef(false);
  const selectedAnswersRef = useRef(selectedAnswers);
  selectedAnswersRef.current = selectedAnswers;

  // State cho phần Luyện Viết (Câu 51~54)
  const [writingFilter, setWritingFilter] = useState<number | "all">("all");
  const [selectedWritingPrompt, setSelectedWritingPrompt] = useState<WritingItem | null>(null);
  const [writingDraft, setWritingDraft] = useState<string>("");
  const [writingDraftA, setWritingDraftA] = useState<string>("");
  const [writingDraftB, setWritingDraftB] = useState<string>("");
  const [showModelAnswer, setShowModelAnswer] = useState<boolean>(false);

  // State cho phần Tài liệu gốc
  const [papersRoundFilter, setPapersRoundFilter] = useState<number | "all">("all");

  const sets = useMemo<ExamSet[]>(() => QUESTION_GROUPS.map((set) => ({
    ...set,
    questions: set.section === "all" ? TOPIK_QUESTION_BANK : TOPIK_QUESTION_BANK.filter((question) => question.section === set.section),
  })).filter((set) => set.questions.length > 0), []);

  const fillBlankSets = useMemo<ExamSet[]>(() => TOPIK_I_FILL_BLANK_EXAMS.map((set) => ({
    ...set,
    section: "grammar",
    icon: ListChecks,
  })), []);

  const handleSubmit = useCallback(() => {
    if (submittedRef.current || !activeSet) return;
    submittedRef.current = true;
    setIsSubmitted(true);
    const correct = activeSet.questions.reduce((sum, question) => sum + (selectedAnswersRef.current[question.id] === question.correctAnswer ? 1 : 0), 0);
    setFinalScore(correct);
    const accuracy = activeSet.questions.length ? Math.round(correct / activeSet.questions.length * 100) : 0;
    ApiClient.recordStudySession("topik", activeSet.questions.length, correct, Math.round(accuracy / 2), Math.max(0, activeSet.duration * 60 - timeLeft));
  }, [activeSet, timeLeft]);

  useEffect(() => {
    if (!activeSet || isSubmitted) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const timer = window.setTimeout(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [activeSet, handleSubmit, isSubmitted, timeLeft]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentIndex]);

  const startSet = (set: ExamSet) => {
    submittedRef.current = false;
    setActiveSet(set);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setIsSubmitted(false);
    setFinalScore(null);
    setTimeLeft(set.duration * 60);
    setShowQuestionMap(false);
  };

  const initialSetStartedRef = useRef(false);
  useEffect(() => {
    if (initialSetStartedRef.current || !initialSetId) return;
    const set = sets.find((item) => item.id === initialSetId);
    if (!set) return;
    initialSetStartedRef.current = true;
    startSet(set);
  }, [initialSetId, sets]);

  const returnToCatalog = () => {
    window.speechSynthesis?.cancel();
    setActiveSet(null);
    setIsSubmitted(false);
    onExit?.();
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  const currentQ = activeSet?.questions[currentIndex];

  useEffect(() => {
    if (!activeSet || isSubmitted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((index) => Math.min(activeSet.questions.length - 1, index + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((index) => Math.max(0, index - 1));
      } else if (["1", "2", "3", "4"].includes(e.key) && currentQ) {
        e.preventDefault();
        const optionIndex = Number(e.key) - 1;
        setSelectedAnswers((answers) => ({ ...answers, [currentQ.id]: optionIndex }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSet, currentIndex, currentQ, isSubmitted]);

  const playListeningPassage = () => {
    if (!currentQ?.passage || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentQ.passage);
    utterance.lang = "ko-KR";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const filteredWritingPrompts = useMemo(() => {
    if (writingFilter === "all") return WRITING_BANK;
    return WRITING_BANK.filter((w) => w.questionNo === writingFilter);
  }, [writingFilter]);

  const groupedPapers = useMemo(() => {
    const map = new Map<number, OfficialPaper[]>();
    for (const p of OFFICIAL_PAPERS) {
      if (papersRoundFilter !== "all" && p.round !== papersRoundFilter) continue;
      const list = map.get(p.round) || [];
      list.push(p);
      map.set(p.round, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [papersRoundFilter]);

  if (!activeSet) {
    const practiceCount = TOPIK_QUESTION_BANK.length;
    const listeningCount = TOPIK_QUESTION_BANK.filter((question) => question.section === "listening").length;
    const readingCount = TOPIK_QUESTION_BANK.filter((question) => question.section === "reading").length;
    const grammarCount = TOPIK_QUESTION_BANK.filter((question) => question.section === "grammar").length;

    const jumpToSet = (id: string) => {
      const target = sets.find((set) => set.id === id);
      if (target) startSet(target);
    };
    const isLevelTab = levelTab === "I" || levelTab === "II";
    const level = levelTab === "II" ? "II" : "I";
    const writingCount = (questionNo: number) => WRITING_BANK.filter((item) => item.questionNo === questionNo).length;

    return (
      <div className="topik-apple">
        <section className="ta-hero">
          <div className="ta-container ta-hero-grid">
            <div>
              <p className="ta-eyebrow">HaechiVN · Trung tâm luyện thi</p>
              <h1 className="ta-hero-title">TOPIK I &amp; II</h1>
              <p className="ta-hero-lede">Luyện đúng dạng đề. Viết đúng giấy thi.</p>
              <p className="ta-hero-body">
                {practiceCount} câu luyện theo dạng bài, 24 đề chính thức và {WRITING_BANK.length} đề viết có bài mẫu — trong một lộ trình, không cần rời trang.
              </p>
              <div className="ta-hero-actions">
                <button type="button" className="ta-btn ta-btn-primary" onClick={() => setLevelTab("I")}>
                  Bắt đầu luyện
                  <ArrowRight aria-hidden="true" />
                </button>
                <button type="button" className="ta-btn ta-btn-ghost" onClick={() => setLevelTab("papers")}>
                  Kho đề chính thức
                </button>
              </div>
              <div className="ta-hero-stats">
                <div className="ta-hero-stat"><b>{practiceCount}</b><span>câu luyện</span></div>
                <div className="ta-hero-stat"><b>24</b><span>đề chính thức</span></div>
                <div className="ta-hero-stat"><b>{WRITING_BANK.length}</b><span>đề viết</span></div>
              </div>
            </div>
            <aside className="ta-hero-aside" aria-label="Bắt đầu nhanh">
              <p className="ta-aside-label">Bắt đầu nhanh</p>
              <button type="button" className="ta-jump" onClick={() => jumpToSet("listening")}>
                <span className="num">01</span><span className="lbl">Luyện nghe</span><span className="time">{listeningCount} câu</span>
              </button>
              <button type="button" className="ta-jump" onClick={() => jumpToSet("reading")}>
                <span className="num">02</span><span className="lbl">Luyện đọc</span><span className="time">{readingCount} câu</span>
              </button>
              <button type="button" className="ta-jump" onClick={() => jumpToSet("grammar")}>
                <span className="num">03</span><span className="lbl">Từ vựng &amp; ngữ pháp</span><span className="time">{grammarCount} câu</span>
              </button>
              <button type="button" className="ta-jump" onClick={() => setLevelTab("writing")}>
                <span className="num">04</span><span className="lbl">Viết 원고지</span><span className="time">Câu 51–54</span>
              </button>
            </aside>
          </div>
        </section>

        <div className="ta-subnav">
          <div className="ta-container">
            <div className="ta-tabs" role="tablist" aria-label="Lộ trình TOPIK">
              <button type="button" role="tab" aria-selected={levelTab === "I"} className="ta-tab" onClick={() => setLevelTab("I")}>TOPIK I</button>
              <button type="button" role="tab" aria-selected={levelTab === "II"} className="ta-tab" onClick={() => setLevelTab("II")}>TOPIK II</button>
              <button type="button" role="tab" aria-selected={levelTab === "writing"} className="ta-tab" onClick={() => setLevelTab("writing")}>Luyện viết</button>
              <button type="button" role="tab" aria-selected={levelTab === "papers"} className="ta-tab" onClick={() => setLevelTab("papers")}>Đề thi gốc</button>
            </div>
          </div>
        </div>

        {isLevelTab && (
          <section className="ta-section">
            <div className="ta-container">
              <div className="ta-section-head">
                <div>
                  <p className="ta-eyebrow">{levelTab === "I" ? "Sơ cấp · Cấp 1–2" : "Trung · Cao cấp 3–6"}</p>
                  <h2 className="ta-h2" style={{ marginTop: 10 }}>Bộ luyện TOPIK {level}</h2>
                  <p className="ta-lede">
                    {levelTab === "I"
                      ? "Chọn một dạng bài để bắt đầu. Mỗi lượt luyện ngắn, có chấm điểm và giải thích ngay."
                      : "Nghe và đọc ở độ khó cao hơn, kèm luyện viết luận 600–700 chữ."}
                  </p>
                </div>
                <span className="ta-meta">{levelTab === "I" ? `${practiceCount} câu · 4 dạng bài` : "100 câu · 180 phút"}</span>
              </div>

              <div className="ta-set-grid">
                {sets.map((set) => {
                  const Icon = set.icon;
                  const content = (
                    <>
                      <span className="ta-set-icon"><Icon aria-hidden="true" /></span>
                      <span>
                        <span className="ta-set-title">{set.title}</span>
                        <span className="ta-set-sub">{set.subtitle}</span>
                        <span className="ta-set-meta">{set.questions.length} câu · {set.duration} phút</span>
                      </span>
                      <span className="ta-set-go" aria-hidden="true"><ArrowRight /></span>
                    </>
                  );
                  // Bộ luyện có trang riêng thì mở bằng link để có URL chia sẻ được.
                  return set.id === "grammar" ? (
                    <a key={set.id} className="ta-set-card" href="/topik/grammar">{content}</a>
                  ) : (
                    <button key={set.id} type="button" className="ta-set-card" onClick={() => startSet(set)}>
                      {content}
                    </button>
                  );
                })}
              </div>

              <div className="ta-section-head" style={{ marginTop: 48 }}>
                <div>
                  <h3 className="ta-h3">Các kỳ TOPIK {level}</h3>
                  <p className="ta-lede">
                    {levelTab === "I" ? "12 kỳ trong danh mục lưu trữ · 70 câu · 100 phút mỗi kỳ." : "Đề gốc NIIED 2014–2025, kèm audio và đáp án."}
                  </p>
                </div>
                <a className="ta-link" href="/topik/archive">
                  Mở kho 24 đề <ArrowRight aria-hidden="true" />
                </a>
              </div>

              <div className="ta-index" aria-label={`Danh sách kỳ thi TOPIK ${level}`}>
                {OFFICIAL_EXAM_SESSIONS.map(({ round, year }) => (
                  <div className="ta-row" key={`${level}-${round}`}>
                    <span className="ta-row-no">{round}</span>
                    <div>
                      <p className="ta-row-title">Kỳ {round} · {year}</p>
                      <p className="ta-row-sub">TOPIK {level} · {level === "I" ? "70 câu · 100 phút" : "100 câu · 180 phút"}</p>
                    </div>
                    <div className="ta-row-actions">
                      <a
                        className="ta-btn ta-btn-quiet ta-btn-sm"
                        href={`/topik/archive?id=${round}-topik${level === "I" ? "1" : "2"}&mode=practice`}
                      >
                        Luyện đề
                      </a>
                      <a
                        className="ta-btn ta-btn-quiet ta-btn-sm"
                        href={`/topik/archive?id=${round}-topik${level === "I" ? "1" : "2"}&mode=mock`}
                      >
                        Thi thử
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {levelTab === "writing" && (
          <section className="ta-section">
            <div className="ta-container">
              {selectedWritingPrompt ? (
                <div className="ta-stack">
                  <div className="ta-section-head" style={{ marginBottom: 0 }}>
                    <div>
                      <p className="ta-eyebrow">TOPIK II · Câu {selectedWritingPrompt.questionNo}</p>
                      <h2 className="ta-h2" style={{ marginTop: 10 }}>{selectedWritingPrompt.topic}</h2>
                      <p className="ta-lede">{selectedWritingPrompt.category}</p>
                    </div>
                    <button
                      type="button"
                      className="ta-btn ta-btn-quiet"
                      onClick={() => {
                        setSelectedWritingPrompt(null);
                        setWritingDraft("");
                        setWritingDraftA("");
                        setWritingDraftB("");
                        setShowModelAnswer(false);
                      }}
                    >
                      <ArrowLeft aria-hidden="true" /> Danh sách đề viết
                    </button>
                  </div>

                  <div className="ta-prompt" aria-label="Đề bài">{selectedWritingPrompt.promptText}</div>

                  {selectedWritingPrompt.questionNo <= 52 ? (
                    <div className="ta-grid-2">
                      <label className="ta-field">
                        <span className="ta-label">Đáp án cho (ㄱ)</span>
                        <input
                          className="ta-input"
                          type="text"
                          value={writingDraftA}
                          onChange={(event) => setWritingDraftA(event.target.value)}
                          placeholder="Gõ đáp án tiếng Hàn cho (ㄱ)…"
                        />
                      </label>
                      <label className="ta-field">
                        <span className="ta-label">Đáp án cho (ㄴ)</span>
                        <input
                          className="ta-input"
                          type="text"
                          value={writingDraftB}
                          onChange={(event) => setWritingDraftB(event.target.value)}
                          placeholder="Gõ đáp án tiếng Hàn cho (ㄴ)…"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="ta-stack" style={{ gap: 8 }}>
                      <div className="ta-field" style={{ gridTemplateColumns: "1fr auto", alignItems: "center" }}>
                        <span className="ta-label">Bài làm của bạn (tiếng Hàn)</span>
                        <span className="ta-meta">
                          {writingDraft.length} ký tự
                          {selectedWritingPrompt.questionNo === 53 ? " · chuẩn 200–300" : " · chuẩn 600–700"}
                        </span>
                      </div>
                      <textarea
                        className="ta-textarea"
                        value={writingDraft}
                        onChange={(event) => setWritingDraft(event.target.value)}
                        placeholder="Nhập bài viết của bạn bằng tiếng Hàn…"
                        rows={8}
                      />
                    </div>
                  )}

                  <div className="ta-chip-row">
                    <button
                      type="button"
                      className="ta-btn ta-btn-primary ta-btn-sm"
                      onClick={() => setShowModelAnswer((value) => !value)}
                    >
                      {showModelAnswer ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                      {showModelAnswer ? "Ẩn bài giải mẫu" : "Xem bài giải mẫu"}
                    </button>
                  </div>

                  {showModelAnswer && (
                    <div className="ta-stack">
                      {selectedWritingPrompt.modelAnswers.map((answer, index) => (
                        <div className="ta-prompt" key={index} style={{ borderLeft: "3px solid var(--ta-success)" }}>
                          {answer}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="ta-section-head">
                    <div>
                      <p className="ta-eyebrow">TOPIK II · Câu 51–54</p>
                      <h2 className="ta-h2" style={{ marginTop: 10 }}>Luyện viết có bài mẫu</h2>
                      <p className="ta-lede">{WRITING_BANK.length} đề viết, chấm theo từng ô trên giấy thi 20 cột. Đúng tô xanh, sai tô đỏ.</p>
                    </div>
                    <span className="ta-meta">{WRITING_BANK.length} đề · 4 dạng câu</span>
                  </div>

                  <div className="ta-set-grid">
                    {[51, 52, 53, 54].map((questionNo) => (
                      <button
                        key={questionNo}
                        type="button"
                        className="ta-set-card"
                        onClick={() => {
                          setWritingFilter(questionNo);
                          setSelectedWritingPrompt(null);
                        }}
                      >
                        <span className="ta-set-icon" style={{ fontFamily: "var(--ta-mono)", fontSize: 14, fontWeight: 600 }}>{questionNo}</span>
                        <span>
                          <span className="ta-set-title">
                            {questionNo === 51 && "Điền thông báo / thư từ"}
                            {questionNo === 52 && "Giải thích"}
                            {questionNo === 53 && "Phân tích biểu đồ"}
                            {questionNo === 54 && "Nghị luận xã hội"}
                          </span>
                          <span className="ta-set-sub">
                            {questionNo === 51 && "Điền hai vế ㉠ và ㉡ theo ngữ cảnh."}
                            {questionNo === 52 && "Nối logic giải thích, khoa học."}
                            {questionNo === 53 && "Viết đoạn 200–300 chữ từ số liệu."}
                            {questionNo === 54 && "Bài luận 600–700 chữ, có dàn ý gợi ý."}
                          </span>
                          <span className="ta-set-meta">Câu {questionNo} · {writingCount(questionNo)} đề</span>
                        </span>
                        <span className="ta-set-go" aria-hidden="true"><ArrowRight /></span>
                      </button>
                    ))}
                  </div>

                  <div className="ta-feature" style={{ marginTop: 40 }}>
                    <div>
                      <p className="ta-eyebrow">원고지 · Answer sheet</p>
                      <h3 className="ta-h3" style={{ marginTop: 12 }}>Viết trên đúng tờ giấy thi.</h3>
                      <p className="ta-lede">Mỗi ký tự vào một ô, 20 ô mỗi dòng. Hệ thống đối chiếu bài mẫu và tô từng ô đúng hoặc sai.</p>
                      <ul className="ta-feature-list">
                        <li><CheckCircle2 aria-hidden="true" /><span>Khung gõ tự động dàn chữ vào lưới 20 cột.</span></li>
                        <li><CheckCircle2 aria-hidden="true" /><span>Ba cấp gợi ý: cấu trúc, từ khoá, đáp án mẫu.</span></li>
                        <li><CheckCircle2 aria-hidden="true" /><span>Bản xem trước cập nhật theo từng ký tự đã gõ.</span></li>
                      </ul>
                      <a className="ta-btn ta-btn-primary" href="/topik/wongoji" style={{ marginTop: 24 }}>
                        Mở phòng viết 원고지 <ArrowRight aria-hidden="true" />
                      </a>
                    </div>
                    <div className="ta-mini-paper" aria-hidden="true">
                      <div className="ta-mini-head">
                        <span className="ta-mini-title">주관식 답란</span>
                        <span className="ta-mini-sub">TOPIK II</span>
                      </div>
                      <div className="ta-mini-grid">
                        {Array.from("스키 캠프 회원 모집").concat([" ", "한", "국", "대", "학", "교", "학", "생", " ", " ", " "]).slice(0, 32).map((char, index) => (
                          <span key={index} className={`ta-mini-cell${index === 12 || index === 13 ? " is-blank" : ""}`}>
                            {index === 12 || index === 13 ? "ㄱ" : char}
                          </span>
                        ))}
                      </div>
                      <div className="ta-mini-foot"><span>20 ô / dòng</span><span>Câu 51</span></div>
                    </div>
                  </div>

                  <div className="ta-section-head" style={{ marginTop: 48 }}>
                    <div>
                      <h3 className="ta-h3">Kho {WRITING_BANK.length} đề viết</h3>
                      <p className="ta-lede">Chọn một đề để viết và đối chiếu bài mẫu NIIED.</p>
                    </div>
                    <div className="ta-chip-row">
                      <button type="button" className="ta-chip" aria-pressed={writingFilter === "all"} onClick={() => setWritingFilter("all")}>Tất cả ({WRITING_BANK.length})</button>
                      {[51, 52, 53, 54].map((questionNo) => (
                        <button
                          key={questionNo}
                          type="button"
                          className="ta-chip"
                          aria-pressed={writingFilter === questionNo}
                          onClick={() => setWritingFilter(questionNo)}
                        >
                          Câu {questionNo} ({writingCount(questionNo)})
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="ta-grid-2">
                    {filteredWritingPrompts.map((item) => (
                      <article key={item.id} className="ta-set-card" style={{ gridTemplateColumns: "minmax(0, 1fr)", alignItems: "start" }}>
                        <span>
                          <span className="ta-tag">Câu {item.questionNo}</span>
                          <span className="ta-set-title" style={{ marginTop: 8 }}>{item.topic}</span>
                          <span className="ta-set-sub" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.promptText}</span>
                          <span className="ta-row-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
                            <button
                              type="button"
                              className="ta-btn ta-btn-quiet ta-btn-sm"
                              onClick={() => {
                                setSelectedWritingPrompt(item);
                                setWritingDraft("");
                                setWritingDraftA("");
                                setWritingDraftB("");
                                setShowModelAnswer(false);
                              }}
                            >
                              <Pencil aria-hidden="true" /> Luyện đề này
                            </button>
                          </span>
                        </span>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {levelTab === "papers" && (
          <section className="ta-section">
            <div className="ta-container">
              <div className="ta-section-head">
                <div>
                  <p className="ta-eyebrow">Nguồn NIIED</p>
                  <h2 className="ta-h2" style={{ marginTop: 10 }}>Đề thi gốc &amp; file nghe</h2>
                  <p className="ta-lede">63 tài liệu kỳ 41–91: audio, transcript và đáp án. Chọn kỳ để xem chi tiết.</p>
                </div>
                <span className="ta-tag">PDF · MP3</span>
              </div>

              <div className="ta-chip-row" style={{ marginBottom: 20 }}>
                <button type="button" className="ta-chip" aria-pressed={papersRoundFilter === "all"} onClick={() => setPapersRoundFilter("all")}>Tất cả kỳ</button>
                {[91, 83, 64, 60, 52, 47, 41].map((round) => (
                  <button key={round} type="button" className="ta-chip" aria-pressed={papersRoundFilter === round} onClick={() => setPapersRoundFilter(round)}>
                    Kỳ {round}
                  </button>
                ))}
              </div>

              <div className="ta-index">
                {groupedPapers.map(([round, papers]) => (
                  <div className="ta-row" key={round}>
                    <span className="ta-row-no">{round}</span>
                    <div>
                      <p className="ta-row-title">Kỳ {round} · {papers.length} tệp</p>
                      <p className="ta-row-sub">
                        {papers.filter((paper) => paper.format === "MP3").length} audio · {papers.filter((paper) => paper.format === "PDF").length} PDF · NIIED
                      </p>
                    </div>
                    <div className="ta-row-actions">
                      <a className="ta-btn ta-btn-quiet ta-btn-sm" href={`/topik/archive?id=${round}-topik1&mode=practice`}>TOPIK I</a>
                      <a className="ta-btn ta-btn-quiet ta-btn-sm" href={`/topik/archive?id=${round}-topik2&mode=practice`}>TOPIK II</a>
                    </div>
                  </div>
                ))}
                {groupedPapers.length === 0 && (
                  <div className="ta-empty">
                    <FileText aria-hidden="true" />
                    <span>Không có tài liệu cho kỳ này.</span>
                  </div>
                )}
              </div>

              <div className="ta-note">
                <b>Nguồn và lưu ý.</b> Đề thi, hình ảnh và audio thuộc bản quyền của NIIED/TOPIK. HaechiVN lưu trữ nội bộ cho mục đích luyện tập, không thay thế cổng đăng ký hoặc kết quả chính thức.
              </div>
            </div>
          </section>
        )}
      </div>
    );
  }

  // Giao diện khi đang làm bài luyện trắc nghiệm
  const currentCorrect = currentQ ? selectedAnswers[currentQ.id] === currentQ.correctAnswer : false;

  return <main className="mx-auto max-w-3xl space-y-4 pb-24 animate-fadeIn select-none">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <button onClick={returnToCatalog} className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white cursor-pointer">
        <ArrowLeft className="h-4 w-4" /> Chọn bộ khác
      </button>
      <div className="text-center">
        <p className="text-xs font-black text-white">{activeSet.title}</p>
        <p className="text-[10px] text-slate-500">HaechiVN · Luyện thi chuẩn TOPIK</p>
      </div>
      <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-xs font-bold ${
        timeLeft < 120 ? "border-rose-400/30 bg-rose-400/10 text-rose-200" : "border-slate-700 bg-slate-950 text-amber-200"
      }`}>
        <Clock3 className="h-3.5 w-3.5" />
        {formatTime(timeLeft)}
      </span>
    </header>

    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-sky-300">
            Câu {currentIndex + 1} / {activeSet.questions.length}
          </p>
          <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-sky-400 transition"
              style={{ width: `${((currentIndex + 1) / activeSet.questions.length) * 100}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => setShowQuestionMap((value) => !value)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-300 cursor-pointer"
        >
          <ListChecks className="h-4 w-4" />
          {Object.keys(selectedAnswers).length}/{activeSet.questions.length}
        </button>
      </div>

      {showQuestionMap && (
        <div className="mt-3 grid grid-cols-8 gap-2">
          {activeSet.questions.map((question, index) => (
            <button
              key={question.id}
              onClick={() => {
                setCurrentIndex(index);
                setShowQuestionMap(false);
              }}
              className={`h-9 rounded-lg border text-xs font-bold cursor-pointer ${
                index === currentIndex
                  ? "border-sky-400 bg-sky-400/15 text-sky-200"
                  : selectedAnswers[question.id] !== undefined
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700 text-slate-400"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}

      {currentQ && (
        <div className="mt-5 border-t border-slate-800 pt-5">
          {activeSet.instruction && (
            <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Hướng dẫn làm bài</p>
              <p className="mt-1 text-xs text-slate-300">{activeSet.instruction}</p>
            </div>
          )}

          {currentQ.passage && currentQ.section !== "listening" && (
            <div className="mb-4 whitespace-pre-line rounded-xl border border-slate-800 bg-slate-950/70 p-4 font-noto text-sm leading-7 text-slate-200">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Đoạn văn đọc hiểu</p>
              {currentQ.passage}
            </div>
          )}

          {currentQ.section === "listening" && currentQ.passage && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.04] p-4">
              <div>
                <p className="text-xs font-bold text-white">Nghe hội thoại</p>
                <p className="mt-1 text-[10px] text-slate-400">Giọng đọc tiếng Hàn chuẩn</p>
              </div>
              <button
                onClick={playListeningPassage}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-400/15 px-3 py-2 text-xs font-bold text-sky-200 cursor-pointer"
              >
                <Volume2 className="h-4 w-4" /> Phát
              </button>
            </div>
          )}

          <h2 className="font-noto text-base font-black leading-7 text-white">{currentQ.question}</h2>

          <div className="mt-4 space-y-2">
            {currentQ.options.map((option, optionIndex) => {
              const selected = selectedAnswers[currentQ.id] === optionIndex;
              const correct = currentQ.correctAnswer === optionIndex;
              const color = isSubmitted
                ? correct
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
                  : selected
                  ? "border-rose-500/50 bg-rose-500/10 text-rose-100"
                  : "border-slate-800 bg-slate-950/40 text-slate-400"
                : selected
                ? "border-sky-400/50 bg-sky-400/10 text-white"
                : "border-slate-800 bg-slate-950/40 text-slate-200 hover:border-slate-600";

              return (
                <button
                  key={optionIndex}
                  disabled={isSubmitted}
                  onClick={() => setSelectedAnswers((answers) => ({ ...answers, [currentQ.id]: optionIndex }))}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition cursor-pointer ${color}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-black">
                    {optionIndex + 1}
                  </span>
                  <span className="flex-1 font-noto">{option}</span>
                  {isSubmitted && correct && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                  {isSubmitted && selected && !correct && <XCircle className="h-4 w-4 text-rose-300" />}
                </button>
              );
            })}
          </div>

          {isSubmitted && (
            <div className="mt-4 rounded-xl border border-indigo-400/20 bg-indigo-400/[0.05] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Giải thích chi tiết</p>
              <p className="mt-1 text-sm text-slate-200">{currentQ.explanation}</p>
            </div>
          )}

          <div className="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-slate-900/95 backdrop-blur-md p-3.5 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 rounded-b-2xl shadow-xl">
            <button
              onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
              disabled={currentIndex === 0}
              className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
            >
              ← Trước
            </button>
            <div className="flex items-center gap-2">
              {!isSubmitted && (
                <button
                  onClick={handleSubmit}
                  className="rounded-lg border border-amber-400/30 px-4 py-2 text-xs font-black text-amber-200 hover:bg-amber-400/10 cursor-pointer"
                >
                  Nộp bộ luyện
                </button>
              )}
              <button
                onClick={() =>
                  currentIndex === activeSet.questions.length - 1
                    ? isSubmitted
                      ? returnToCatalog()
                      : handleSubmit()
                    : setCurrentIndex((index) => Math.min(activeSet.questions.length - 1, index + 1))
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-2 text-xs font-black text-white shadow-md shadow-sky-500/20 transition active:scale-95 cursor-pointer"
              >
                {currentIndex === activeSet.questions.length - 1 ? (isSubmitted ? "Xong" : "Nộp bài") : "Tiếp"}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {isSubmitted && finalScore !== null && (
      <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5 text-center">
        <p className="text-xs font-bold text-slate-300">Kết quả · {activeSet.title}</p>
        <p className="mt-1 text-3xl font-black text-emerald-300">
          {finalScore} / {activeSet.questions.length}
        </p>
        <p className="text-xs text-slate-400">
          {Math.round((finalScore / activeSet.questions.length) * 100)}% chính xác · Đây là điểm bài luyện tập kiến thức.
        </p>
        <button
          onClick={() => startSet(activeSet)}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Làm lại
        </button>
      </section>
    )}

    <p className="text-center text-[10px] text-slate-600">
      Bài luyện nội bộ do HaechiVN biên soạn · Đề thi chính thức mở từ cổng kho 24 đề TOPIK.
    </p>
  </main>;
};
