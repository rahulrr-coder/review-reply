import type { Lang, SampleReview } from '#lib/types.js';

export const samples: SampleReview[] = [
	{
		id: 'en-5-dish',
		lang: 'en',
		stars: 5,
		label: 'Praises a dish',
		text: "Best filter coffee I've had in Chennai in years. The masala dosa was crisp and the sambar was perfect. The staff remembered our order from last time. Will be back this weekend!"
	},
	{
		id: 'en-1-wait',
		lang: 'en',
		stars: 1,
		label: '40-min wait, cold food',
		text: 'Waited 40 minutes for a table even with a reservation. The food came out cold and the dal was basically water. Really disappointing for the price.'
	},
	{
		id: 'en-3-mixed',
		lang: 'en',
		stars: 3,
		label: 'Good food, rude staff',
		text: 'Food was good. The chicken biryani is genuinely one of the best in the area. But the staff were rude when we asked for extra raita. Felt like we were a bother. Might come back but hope service improves.'
	},
	{
		id: 'ta-4-script',
		lang: 'ta',
		stars: 4,
		label: 'Tamil script',
		text: 'சுவையான தோசை, சட்னி அருமை. ஆனா காபி கொஞ்சம் சூடா இல்ல. அடுத்த முறை கண்டிப்பா வருவோம்.'
	},
	{
		id: 'ta-2-tanglish',
		lang: 'ta',
		stars: 2,
		label: 'Tanglish: parking & attitude',
		text: 'food semma but parking romba kashtam, waiter attitude also not ok. Table kedaikka 20 min wait pannanom. Konjam service improve pannunga.'
	},
	{
		id: 'hi-4-hindi',
		lang: 'hi',
		stars: 4,
		label: 'Hindi, good food',
		text: 'खाना बहुत अच्छा था, खासकर पनीर बटर मसाला। सर्विस थोड़ी धीमी थी लेकिन स्टाफ विनम्र था। ज़रूर वापस आएंगे।'
	},
	{
		id: 'hi-3-hinglish',
		lang: 'hi',
		stars: 3,
		label: 'Hinglish: AC & service charge',
		text: 'Biryani ekdum mast tha but AC kaam nahi kar raha tha aur bill mein service charge bina bataye add kar diya. Thoda dhyan do yaar.'
	},
	{
		id: 'te-5-telugu',
		lang: 'te',
		stars: 5,
		label: 'Telugu, loved the biryani',
		text: 'బిర్యానీ చాలా రుచిగా ఉంది, సర్వీస్ కూడా వేగంగా ఉంది. మళ్ళీ తప్పకుండా వస్తాం!'
	},
	{
		id: 'kn-2-kannada',
		lang: 'kn',
		stars: 2,
		label: 'Kannada, long wait',
		text: 'ಊಟ ಚೆನ್ನಾಗಿತ್ತು, ಆದರೆ ಟೇಬಲ್‌ಗಾಗಿ 30 ನಿಮಿಷ ಕಾಯಬೇಕಾಯಿತು. ಸಿಬ್ಬಂದಿ ಕೂಡ ಗಮನ ಕೊಡಲಿಲ್ಲ.'
	},
	{
		id: 'ml-4-malayalam',
		lang: 'ml',
		stars: 4,
		label: 'Malayalam, parking issue',
		text: 'അപ്പവും സ്റ്റ്യൂവും നല്ല രുചിയായിരുന്നു. പാർക്കിംഗ് കുറച്ച് ബുദ്ധിമുട്ടാണ്. വീണ്ടും വരും.'
	},
	{
		id: 'mr-1-marathi',
		lang: 'mr',
		stars: 1,
		label: 'Marathi, cold & late',
		text: 'जेवण थंड होते आणि ऑर्डरला एक तास लागला. खूप निराशा झाली.'
	},
	{
		id: 'bn-5-bengali',
		lang: 'bn',
		stars: 5,
		label: 'Bengali, homely fish curry',
		text: 'মাছের ঝোল অসাধারণ ছিল, একদম বাড়ির মতো স্বাদ। কর্মীরাও খুব ভদ্র। আবার আসব!'
	},
	{
		id: 'gu-4-gujarati',
		lang: 'gu',
		stars: 4,
		label: 'Gujarati, crowded',
		text: 'થાળી ખૂબ સરસ હતી, ખાસ કરીને ઢોકળા. ફક્ત થોડી ભીડ વધારે હતી. ફરી આવીશું.'
	}
];

// Suggestions shown under the review box for the chosen language. 'auto' shows one per language.
export function samplesFor(lang: Lang): SampleReview[] {
	if (lang !== 'auto') return samples.filter((s) => s.lang === lang);
	return samples.filter((s, i) => samples.findIndex((x) => x.lang === s.lang) === i);
}
