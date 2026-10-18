export type Tone = 'warm' | 'professional' | 'friendly';

// Single source for supported languages: the UI select, API validation and prompt all read this.
export const LANG_NAMES = {
	en: 'English',
	hi: 'Hindi',
	ta: 'Tamil',
	te: 'Telugu',
	kn: 'Kannada',
	ml: 'Malayalam',
	mr: 'Marathi',
	bn: 'Bengali',
	gu: 'Gujarati'
} as const;
export type Lang = 'auto' | keyof typeof LANG_NAMES;
export type Stars = 1 | 2 | 3 | 4 | 5;

export interface BusinessProfile {
	name: string;
	type: string;
	tone: Tone;
	signOff: string;
	contact?: string;
	canOffer?: string;
}

export interface ReplyRequest {
	profile: BusinessProfile;
	review: string;
	stars: Stars;
	lang: Lang;
}

export interface Reply {
	style: 'short' | 'standard' | 'warm';
	text: string;
}

export interface ReplyResult {
	sentiment: 'positive' | 'mixed' | 'negative';
	language: string;
	replies: Reply[];
	ownerNote?: string;
}

export interface SampleReview {
	id: string;
	lang: Exclude<Lang, 'auto'>;
	stars: Stars;
	label: string;
	text: string;
}
