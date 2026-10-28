type StateType = 'New' | 'Learning' | 'Review' | 'Relearning';
declare enum State {
    New = 0,
    Learning = 1,
    Review = 2,
    Relearning = 3
}
type RatingType = 'Manual' | 'Again' | 'Hard' | 'Good' | 'Easy';
declare enum Rating {
    Manual = 0,
    Again = 1,
    Hard = 2,
    Good = 3,
    Easy = 4
}
type GradeType = Exclude<RatingType, 'Manual'>;
type Grade = Exclude<Rating, Rating.Manual>;
interface ReviewLog {
    rating: Rating;
    state: State;
    due: Date;
    stability: number;
    difficulty: number;
    /**
     * @deprecated This field will be removed in version 6.0.0
     */
    elapsed_days: number;
    /**
     * @deprecated This field will be removed in version 6.0.0
     */
    last_elapsed_days: number;
    scheduled_days: number;
    learning_steps: number;
    review: Date;
}
type RecordLogItem = {
    card: Card;
    log: ReviewLog;
};
type RecordLog = {
    [key in Grade]: RecordLogItem;
};
interface Card {
    due: Date;
    stability: number;
    difficulty: number;
    /**
     * @deprecated This field will be removed in version 6.0.0
     */
    elapsed_days: number;
    scheduled_days: number;
    learning_steps: number;
    reps: number;
    lapses: number;
    state: State;
    last_review?: Date;
}
interface CardInput extends Omit<Card, 'state' | 'due' | 'last_review'> {
    state: StateType | State;
    due: DateInput;
    last_review?: DateInput | null;
}
type DateInput = Date | number | string;
type TimeUnit = 'm' | 'h' | 'd';
type StepUnit = `${number}${TimeUnit}`;
/**
 * (re)Learning steps:
 * [1m, 10m]
 * step1:again=1m hard=6m good=10m
 * step2(good): again=1m hard=10m
 *
 * [5m]
 * step1:again=5m hard=8m
 * step2(good): again=5m
 * step2(hard): again=5m hard=7.5m
 *
 * []
 * step: Managed by FSRS
 *
 */
type Steps = StepUnit[] | readonly StepUnit[];
interface ReviewLogInput extends Omit<ReviewLog, 'rating' | 'state' | 'due' | 'review'> {
    rating: RatingType | Rating;
    state: StateType | State;
    due: DateInput;
    review: DateInput;
}
interface FSRSParameters {
    request_retention: number;
    maximum_interval: number;
    w: number[] | readonly number[];
    enable_fuzz: boolean;
    /**
     * When enable_short_term = false, the (re)learning steps are not applied.
     */
    enable_short_term: boolean;
    learning_steps: Steps;
    relearning_steps: Steps;
}
interface FSRSReview {
    /**
     * 0-4: Manual, Again, Hard, Good, Easy
     * = revlog.rating
     */
    rating: Rating;
    /**
     * The number of days that passed
     * = revlog.elapsed_days
     * = round(revlog[-1].review - revlog[-2].review)
     */
    delta_t: number;
}
type FSRSHistory = Partial<Omit<ReviewLog, 'rating' | 'review' | 'elapsed_days'>> & ({
    rating: Grade;
    review: DateInput | Date;
} | {
    rating: Rating.Manual;
    due: DateInput | Date;
    state: State;
    review: DateInput | Date;
});
interface FSRSState {
    stability: number;
    difficulty: number;
}

type unit = 'days' | 'minutes';
type int = number & {
    __int__: undefined;
};
type double = number & {
    __double__: undefined;
};
interface IPreview extends RecordLog {
    [Symbol.iterator](): IterableIterator<RecordLogItem>;
}
interface IScheduler {
    preview(): IPreview;
    review(state: Grade): RecordLogItem;
}
/**
 * Options for rescheduling.
 *
 * @template T - The type of the result returned by the `recordLogHandler` function.
 */
type RescheduleOptions<T = RecordLogItem> = {
    /**
     * A function that handles recording the log.
     *
     * @param recordLog - The log to be recorded.
     * @returns The result of recording the log.
     */
    recordLogHandler: (recordLog: RecordLogItem) => T;
    /**
     * A function that defines the order of reviews.
     *
     * @param a - The first FSRSHistory object.
     * @param b - The second FSRSHistory object.
     * @returns A negative number if `a` should be ordered before `b`, a positive number if `a` should be ordered after `b`, or 0 if they have the same order.
     */
    reviewsOrderBy: (a: FSRSHistory, b: FSRSHistory) => number;
    /**
     * Indicating whether to skip manual steps.
     */
    skipManual: boolean;
    /**
     * Indicating whether to update the FSRS memory state.
     */
    update_memory_state: boolean;
    /**
     * The current date and time.
     */
    now: DateInput;
    /**
     * The input for the first card.
     */
    first_card?: CardInput;
};
type IReschedule<T = RecordLogItem> = {
    collections: T[];
    reschedule_item: T | null;
};

/**
 * $$\text{decay} = -w_{20}$$
 *
 * $$\text{factor} = e^{\frac{\ln 0.9}{\text{decay}}} - 1$$
 */
declare const computeDecayFactor: (decayOrParams: number | number[] | readonly number[]) => {
    decay: number;
    factor: number;
};
/**
 * The formula used is :
 * $$R(t,S) = (1 + \text{FACTOR} \times \frac{t}{9 \cdot S})^{\text{DECAY}}$$
 * @param {number} decay - The decay factor, decay should be greater than or equal to 0.1 and less than or equal to 0.8.
 * @param {number} elapsed_days t days since the last review
 * @param {number} stability Stability (interval when R=90%)
 * @return {number} r Retrievability (probability of recall)
 */
declare function forgetting_curve(decay: number, elapsed_days: number, stability: number): number;
declare function forgetting_curve(parameters: number[] | readonly number[], elapsed_days: number, stability: number): number;
/**
 * @see https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-45
 */
declare class FSRSAlgorithm {
    protected param: FSRSParameters;
    protected intervalModifier: number;
    protected _seed?: string;
    constructor(params: Partial<FSRSParameters>);
    get interval_modifier(): number;
    set seed(seed: string);
    /**
     * @see https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-5
     *
     * The formula used is: $$I(r,s) = (r^{\frac{1}{DECAY}} - 1) / FACTOR \times s$$
     * @param request_retention 0<request_retention<=1,Requested retention rate
     * @throws {Error} Requested retention rate should be in the range (0,1]
     */
    calculate_interval_modifier(request_retention: number): number;
    /**
     * Get the parameters of the algorithm.
     */
    get parameters(): FSRSParameters;
    /**
     * Set the parameters of the algorithm.
     * @param params Partial<FSRSParameters>
     */
    set parameters(params: Partial<FSRSParameters>);
    protected params_handler_proxy(): ProxyHandler<FSRSParameters>;
    private update_parameters;
    private prepare_parameters;
    /**
     * The formula used is :
     * $$ S_0(G) = w_{G-1}$$
     * $$S_0 = \max \lbrace S_0,0.1\rbrace $$
  
     * @param g Grade (rating at Anki) [1.again,2.hard,3.good,4.easy]
     * @return Stability (interval when R=90%)
     */
    init_stability(g: Grade): number;
    /**
     * The formula used is :
     * $$D_0(G) = w_4 - e^{(G-1) \cdot w_5} + 1 $$
     * $$D_0 = \min \lbrace \max \lbrace D_0(G),1 \rbrace,10 \rbrace$$
     * where the $$D_0(1)=w_4$$ when the first rating is good.
     *
     * @param {Grade} g Grade (rating at Anki) [1.again,2.hard,3.good,4.easy]
     * @return {number} Difficulty $$D \in [1,10]$$
     */
    init_difficulty(g: Grade): number;
    /**
     * If fuzzing is disabled or ivl is less than 2.5, it returns the original interval.
     * @param {number} ivl - The interval to be fuzzed.
     * @param {number} elapsed_days t days since the last review
     * @return {number} - The fuzzed interval.
     **/
    apply_fuzz(ivl: number, elapsed_days: number): int;
    /**
     *   @see The formula used is : {@link FSRSAlgorithm.calculate_interval_modifier}
     *   @param {number} s - Stability (interval when R=90%)
     *   @param {number} elapsed_days t days since the last review
     */
    next_interval(s: number, elapsed_days: number): int;
    /**
     * @see https://github.com/open-spaced-repetition/fsrs4anki/issues/697
     */
    linear_damping(delta_d: number, old_d: number): number;
    /**
     * The formula used is :
     * $$\text{delta}_d = -w_6 \cdot (g - 3)$$
     * $$\text{next}_d = D + \text{linear damping}(\text{delta}_d , D)$$
     * $$D^\prime(D,R) = w_7 \cdot D_0(4) +(1 - w_7) \cdot \text{next}_d$$
     * @param {number} d Difficulty $$D \in [1,10]$$
     * @param {Grade} g Grade (rating at Anki) [1.again,2.hard,3.good,4.easy]
     * @return {number} $$\text{next}_D$$
     */
    next_difficulty(d: number, g: Grade): number;
    /**
     * The formula used is :
     * $$w_7 \cdot \text{init} +(1 - w_7) \cdot \text{current}$$
     * @param {number} init $$w_2 : D_0(3) = w_2 + (R-2) \cdot w_3= w_2$$
     * @param {number} current $$D - w_6 \cdot (R - 2)$$
     * @return {number} difficulty
     */
    mean_reversion(init: number, current: number): number;
    /**
     * The formula used is :
     * $$S^\prime_r(D,S,R,G) = S\cdot(e^{w_8}\cdot (11-D)\cdot S^{-w_9}\cdot(e^{w_{10}\cdot(1-R)}-1)\cdot w_{15}(\text{if} G=2) \cdot w_{16}(\text{if} G=4)+1)$$
     * @param {number} d Difficulty D \in [1,10]
     * @param {number} s Stability (interval when R=90%)
     * @param {number} r Retrievability (probability of recall)
     * @param {Grade} g Grade (Rating[0.again,1.hard,2.good,3.easy])
     * @return {number} S^\prime_r new stability after recall
     */
    next_recall_stability(d: number, s: number, r: number, g: Grade): number;
    /**
     * The formula used is :
     * $$S^\prime_f(D,S,R) = w_{11}\cdot D^{-w_{12}}\cdot ((S+1)^{w_{13}}-1) \cdot e^{w_{14}\cdot(1-R)}$$
     * enable_short_term = true : $$S^\prime_f \in \min \lbrace \max \lbrace S^\prime_f,0.01\rbrace, \frac{S}{e^{w_{17} \cdot w_{18}}} \rbrace$$
     * enable_short_term = false : $$S^\prime_f \in \min \lbrace \max \lbrace S^\prime_f,0.01\rbrace, S \rbrace$$
     * @param {number} d Difficulty D \in [1,10]
     * @param {number} s Stability (interval when R=90%)
     * @param {number} r Retrievability (probability of recall)
     * @return {number} S^\prime_f new stability after forgetting
     */
    next_forget_stability(d: number, s: number, r: number): number;
    /**
     * The formula used is :
     * $$S^\prime_s(S,G) = S \cdot e^{w_{17} \cdot (G-3+w_{18})}$$
     * @param {number} s Stability (interval when R=90%)
     * @param {Grade} g Grade (Rating[0.again,1.hard,2.good,3.easy])
     */
    next_short_term_stability(s: number, g: Grade): number;
    /**
     * The formula used is :
     * $$R(t,S) = (1 + \text{FACTOR} \times \frac{t}{9 \cdot S})^{\text{DECAY}}$$
     * @param {number} elapsed_days t days since the last review
     * @param {number} stability Stability (interval when R=90%)
     * @return {number} r Retrievability (probability of recall)
     */
    forgetting_curve: (elapsed_days: number, stability: number) => number;
    /**
     * Calculates the next state of memory based on the current state, time elapsed, and grade.
     *
     * @param memory_state - The current state of memory, which can be null.
     * @param t - The time elapsed since the last review.
     * @param {Rating} g Grade (Rating[0.Manual,1.Again,2.Hard,3.Good,4.Easy])
     * @param r - Optional retrievability value. If not provided, it will be calculated.
     * @returns The next state of memory with updated difficulty and stability.
     */
    next_state(memory_state: FSRSState | null, t: number, g: number, r?: number): FSRSState;
}

declare enum StrategyMode {
    SCHEDULER = "Scheduler",
    LEARNING_STEPS = "LearningSteps",
    SEED = "Seed"
}
type TSeedStrategy = (this: AbstractScheduler) => string;
type TSchedulerStrategy<T extends CardInput | Card = CardInput | Card> = new (card: T, now: DateInput, algorithm: FSRSAlgorithm, strategies: Map<StrategyMode, TStrategyHandler>) => IScheduler;
/**
 * When enable_short_term = false, the learning steps strategy will not take effect.
 */
type TLearningStepsStrategy = (params: FSRSParameters, state: State, cur_step: number) => {
    [K in Grade]?: {
        scheduled_minutes: number;
        next_step: number;
    };
};
type StrategyMap = {
    [StrategyMode.SCHEDULER]: TSchedulerStrategy;
    [StrategyMode.SEED]: TSeedStrategy;
    [StrategyMode.LEARNING_STEPS]: TLearningStepsStrategy;
};
type TStrategyHandler<E = StrategyMode> = E extends StrategyMode ? StrategyMap[E] : never;

declare abstract class AbstractScheduler implements IScheduler {
    protected last: Card;
    protected current: Card;
    protected review_time: Date;
    protected next: Map<Grade, RecordLogItem>;
    protected algorithm: FSRSAlgorithm;
    protected strategies: Map<StrategyMode, TStrategyHandler> | undefined;
    protected elapsed_days: number;
    constructor(card: CardInput | Card, now: DateInput, algorithm: FSRSAlgorithm, strategies?: Map<StrategyMode, TStrategyHandler>);
    protected checkGrade(grade: Grade): void;
    private init;
    preview(): IPreview;
    private previewIterator;
    review(grade: Grade): RecordLogItem;
    protected abstract newState(grade: Grade): RecordLogItem;
    protected abstract learningState(grade: Grade): RecordLogItem;
    protected abstract reviewState(grade: Grade): RecordLogItem;
    protected buildLog(rating: Grade): ReviewLog;
}

declare const default_request_retention = 0.9;
declare const default_maximum_interval = 36500;
declare const default_enable_fuzz = false;
declare const default_enable_short_term = true;
declare const default_learning_steps: readonly StepUnit[];
declare const default_relearning_steps: readonly StepUnit[];
declare const FSRSVersion: string;
declare const S_MIN = 0.001;
declare const S_MAX = 36500;
declare const INIT_S_MAX = 100;
declare const FSRS5_DEFAULT_DECAY = 0.5;
declare const FSRS6_DEFAULT_DECAY = 0.1542;
declare const default_w: readonly number[];
declare const W17_W18_Ceiling = 2;
declare const CLAMP_PARAMETERS: (w17_w18_ceiling: number, enable_short_term?: boolean) => number[][];

declare class TypeConvert {
    static card<T extends Card | CardInput>(card: T): Card;
    static rating(value: unknown): Rating;
    static state(value: unknown): State;
    static time(value: unknown): Date;
    static review_log(log: ReviewLogInput | ReviewLog): ReviewLog;
}

declare const clipParameters: (parameters: number[], numRelearningSteps: number, enableShortTerm?: boolean) => number[];
/**
 * @returns The input if the parameters are valid, throws if they are invalid
 * @example
 * try {
 *   generatorParameters({
 *     w: checkParameters([0.40255])
 *   });
 * } catch (e: any) {
 *   alert(e);
 * }
 */
declare const checkParameters: (parameters: number[] | readonly number[]) => number[] | readonly number[];
declare const migrateParameters: (parameters?: number[] | readonly number[], numRelearningSteps?: number, enableShortTerm?: boolean) => number[];
declare const generatorParameters: (props?: Partial<FSRSParameters>) => FSRSParameters;
/**
 * Create an empty card
 * @param now Current time
 * @param afterHandler Convert the result to another type. (Optional)
 * @example
 * ```typescript
 * const card: Card = createEmptyCard(new Date());
 * ```
 * @example
 * ```typescript
 * interface CardUnChecked
 *   extends Omit<Card, "due" | "last_review" | "state"> {
 *   cid: string;
 *   due: Date | number;
 *   last_review: Date | null | number;
 *   state: StateType;
 * }
 *
 * function cardAfterHandler(card: Card) {
 *      return {
 *       ...card,
 *       cid: "test001",
 *       state: State[card.state],
 *       last_review: card.last_review ?? null,
 *     } as CardUnChecked;
 * }
 *
 * const card: CardUnChecked = createEmptyCard(new Date(), cardAfterHandler);
 * ```
 */
declare function createEmptyCard<R = Card>(now?: DateInput, afterHandler?: (card: Card) => R): R;

type RequireOnly<A, K extends keyof A> = {
    [P in K]-?: A[P];
} & Partial<Omit<A, K>>;
interface IFSRS {
    useStrategy<T extends StrategyMode>(mode: T, handler: TStrategyHandler<T>): this;
    clearStrategy(mode?: StrategyMode): this;
    repeat(card: CardInput | Card, now: DateInput): IPreview;
    repeat<R>(card: CardInput | Card, now: DateInput, afterHandler: (recordLog: IPreview) => R): R;
    next(card: CardInput | Card, now: DateInput, grade: Grade): RecordLogItem;
    next<R>(card: CardInput | Card, now: DateInput, grade: Grade, afterHandler: (recordLog: RecordLogItem) => R): R;
    get_retrievability(card: CardInput | Card, now?: DateInput, format?: true): string;
    get_retrievability(card: CardInput | Card, now?: DateInput, format?: false): number;
    rollback(card: CardInput | Card, log: ReviewLogInput): Card;
    rollback<R>(card: CardInput | Card, log: ReviewLogInput, afterHandler: (prevCard: Card) => R): R;
    forget(card: CardInput | Card, now: DateInput, reset_count?: boolean): RecordLogItem;
    forget<R>(card: CardInput | Card, now: DateInput, reset_count: boolean | undefined, afterHandler: (recordLogItem: RecordLogItem) => R): R;
    reschedule<T = RecordLogItem>(current_card: CardInput | Card, reviews?: FSRSHistory[], options?: RequireOnly<RescheduleOptions<T>, 'recordLogHandler'>): IReschedule<T>;
    reschedule(current_card: CardInput | Card, reviews?: FSRSHistory[], options?: Partial<RescheduleOptions<RecordLogItem>>): IReschedule<RecordLogItem>;
}
declare class FSRS extends FSRSAlgorithm implements IFSRS {
    private strategyHandler;
    private Scheduler;
    constructor(param: Partial<FSRSParameters>);
    protected params_handler_proxy(): ProxyHandler<FSRSParameters>;
    useStrategy<T extends StrategyMode>(mode: T, handler: TStrategyHandler<T>): this;
    clearStrategy(mode?: StrategyMode): this;
    private getScheduler;
    repeat(card: CardInput | Card, now: DateInput): IPreview;
    repeat<R>(card: CardInput | Card, now: DateInput, afterHandler: (recordLog: IPreview) => R): R;
    next(card: CardInput | Card, now: DateInput, grade: Grade): RecordLogItem;
    next<R>(card: CardInput | Card, now: DateInput, grade: Grade, afterHandler: (recordLog: RecordLogItem) => R): R;
    get_retrievability(card: CardInput | Card, now?: DateInput, format?: true): string;
    get_retrievability(card: CardInput | Card, now?: DateInput, format?: false): number;
    rollback(card: CardInput | Card, log: ReviewLogInput): Card;
    rollback<R>(card: CardInput | Card, log: ReviewLogInput, afterHandler: (prevCard: Card) => R): R;
    forget(card: CardInput | Card, now: DateInput, reset_count?: boolean): RecordLogItem;
    forget<R>(card: CardInput | Card, now: DateInput, reset_count: boolean | undefined, afterHandler: (recordLogItem: RecordLogItem) => R): R;
    reschedule<T = RecordLogItem>(current_card: CardInput | Card, reviews: FSRSHistory[] | undefined, options: RequireOnly<RescheduleOptions<T>, 'recordLogHandler'>): IReschedule<T>;
    reschedule(current_card: CardInput | Card, reviews?: FSRSHistory[], options?: Partial<RescheduleOptions<RecordLogItem>>): IReschedule<RecordLogItem>;
}
/**
 * Create a new instance of TS-FSRS
 * @param params FSRSParameters
 * @example
 * ```typescript
 * const f = fsrs();
 * ```
 * @example
 * ```typescript
 * const params: FSRSParameters = generatorParameters({ maximum_interval: 1000 });
 * const f = fsrs(params);
 * ```
 * @example
 * ```typescript
 * const f = fsrs({ maximum_interval: 1000 });
 * ```
 */
declare const fsrs: (params?: Partial<FSRSParameters>) => FSRS;

declare global {
    export interface Date {
        /**
         * @deprecated This method will be removed in version 6.0.0.
         *
         */
        scheduler(t: int, isDay?: boolean): Date;
        /**
         * @deprecated This method will be removed in version 6.0.0.
         *
         */
        diff(pre: Date, unit: unit): int;
        /**
         * @deprecated This method will be removed in version 6.0.0.
         *
         */
        format(): string;
        /**
         * @deprecated This method will be removed in version 6.0.0.
         *
         */
        dueFormat(last_review: Date, unit?: boolean, timeUnit?: string[]): string;
    }
}
/**
 * 计算日期和时间的偏移，并返回一个新的日期对象。
 * @param now 当前日期和时间
 * @param t 时间偏移量，当 isDay 为 true 时表示天数，为 false 时表示分钟
 * @param isDay （可选）是否按天数单位进行偏移，默认为 false，表示按分钟单位计算偏移
 * @returns 偏移后的日期和时间对象
 */
declare function date_scheduler(now: DateInput, t: number, isDay?: boolean): Date;
declare function date_diff(now: DateInput, pre: DateInput, unit: unit): number;
declare function formatDate(dateInput: DateInput): string;
declare function show_diff_message(due: DateInput, last_review: DateInput, unit?: boolean, timeUnit?: string[]): string;
/**
 *
 * @deprecated Use TypeConvert.time instead
 * @deprecated This function will be removed in version 6.0.0.
 */
declare function fixDate(value: unknown): Date;
/**
 * @deprecated Use TypeConvert.state instead
 * @deprecated This function will be removed in version 6.0.0.
 */
declare function fixState(value: unknown): State;
/**
 * @deprecated Use TypeConvert.rating instead
 * @deprecated This function will be removed in version 6.0.0.
 */
declare function fixRating(value: unknown): Rating;
declare const Grades: Readonly<Grade[]>;
declare function get_fuzz_range(interval: number, elapsed_days: number, maximum_interval: number): {
    min_ivl: number;
    max_ivl: number;
};
declare function clamp(value: number, min: number, max: number): number;
declare function roundTo(num: number, decimals: number): number;
declare function dateDiffInDays(last: Date, cur: Date): number;

declare const ConvertStepUnitToMinutes: (step: StepUnit) => number;
declare const BasicLearningStepsStrategy: TLearningStepsStrategy;

declare function DefaultInitSeedStrategy(this: AbstractScheduler): string;
/**
 * Generates a seed strategy function for card IDs.
 *
 * @param card_id_field - The field name of the card ID in the current object.
 * @returns A function that generates a seed based on the card ID and repetitions.
 *
 * @remarks
 * The returned function uses the `card_id_field` to retrieve the card ID from the current object.
 * It then adds the number of repetitions (`reps`) to the card ID to generate the seed.
 *
 * @example
 * ```typescript
 * const seedStrategy = GenCardIdSeedStrategy('card_id');
 * const f = fsrs().useStrategy(StrategyMode.SEED, seedStrategy)
 * const card = createEmptyCard<Card & { card_id: number }>()
 * card.card_id = 555
 * const record = f.repeat(card, new Date())
 * ```
 */
declare function GenSeedStrategyWithCardId(card_id_field: string | number): TSeedStrategy;

export { AbstractScheduler, BasicLearningStepsStrategy, CLAMP_PARAMETERS, ConvertStepUnitToMinutes, DefaultInitSeedStrategy, FSRS, FSRS5_DEFAULT_DECAY, FSRS6_DEFAULT_DECAY, FSRSAlgorithm, FSRSVersion, GenSeedStrategyWithCardId, Grades, INIT_S_MAX, Rating, S_MAX, S_MIN, State, StrategyMode, TypeConvert, W17_W18_Ceiling, checkParameters, clamp, clipParameters, computeDecayFactor, createEmptyCard, dateDiffInDays, date_diff, date_scheduler, default_enable_fuzz, default_enable_short_term, default_learning_steps, default_maximum_interval, default_relearning_steps, default_request_retention, default_w, fixDate, fixRating, fixState, forgetting_curve, formatDate, fsrs, generatorParameters, get_fuzz_range, migrateParameters, roundTo, show_diff_message };
export type { Card, CardInput, DateInput, FSRSHistory, FSRSParameters, FSRSReview, FSRSState, Grade, GradeType, IFSRS, IPreview, IReschedule, IScheduler, RatingType, RecordLog, RecordLogItem, RescheduleOptions, ReviewLog, ReviewLogInput, StateType, StepUnit, Steps, TLearningStepsStrategy, TSchedulerStrategy, TSeedStrategy, TStrategyHandler, TimeUnit, double, int, unit };
