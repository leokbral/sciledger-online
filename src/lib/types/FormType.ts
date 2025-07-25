type FormType = {
    originality: number;
    clarity: number;
    literatureReview: number;
    theoreticalFoundation: number;
    methodology: number;
    reproducibility: number;
    results: number;
    figures: number;
    limitations: number;
    language: number;
    impact: number;
    strengths: string;
    weaknesses: string;
    involvesHumanResearch: string;
    ethicsApproval: string;
    recommendation: string;
    [key: string]: string | number;
};

export type { FormType };