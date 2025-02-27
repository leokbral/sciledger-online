import type { CustomThemeConfig } from '@skeletonlabs/tw-plugin';

export const sciLedger: CustomThemeConfig = {
	name: 'sciLedger',
	properties: {
		'--theme-font-family-heading': 'Inter, system-ui, sans-serif',
		'--theme-font-family-base': 'system-ui',
		'--theme-font-color-base': '23 37 84',
		'--theme-font-color-dark': '255 255 255',
		'--theme-rounded-base': '9999px',
		'--theme-rounded-container': '6px',
		'--theme-border-base': '1px',
		'--on-primary': '0 0 0',
		'--on-secondary': '0 0 0',
		'--on-tertiary': '255 255 255',
		'--on-success': '0 0 0',
		'--on-warning': '0 0 0',
		'--on-error': '255 255 255',
		'--on-surface': '255 255 255',
		'--color-primary-50': '239 246 255',
		'--color-primary-100': '219 234 254',
		'--color-primary-200': '191 219 254',
		'--color-primary-300': '147 197 253',
		'--color-primary-400': '96 165 250',
		'--color-primary-500': '59 130 246',
		'--color-primary-600': '37 99 235',
		'--color-primary-700': '29 78 216',
		'--color-primary-800': '30 64 175',
		'--color-primary-900': '30 58 138',
		'--color-secondary-50': '240 249 255',
		'--color-secondary-100': '224 242 254',
		'--color-secondary-200': '186 230 253',
		'--color-secondary-300': '125 211 252',
		'--color-secondary-400': '56 189 248',
		'--color-secondary-500': '14 165 233',
		'--color-secondary-600': '2 132 199',
		'--color-secondary-700': '3 105 161',
		'--color-secondary-800': '7 89 133',
		'--color-secondary-900': '12 74 110',
		'--color-tertiary-50': '238 242 255',
		'--color-tertiary-100': '224 231 255',
		'--color-tertiary-200': '199 210 254',
		'--color-tertiary-300': '165 180 252',
		'--color-tertiary-400': '129 140 248',
		'--color-tertiary-500': '99 102 241',
		'--color-tertiary-600': '79 70 229',
		'--color-tertiary-700': '67 56 202',
		'--color-tertiary-800': '55 48 163',
		'--color-tertiary-900': '49 46 129',
		'--color-success-50': '237 247 220',
		'--color-success-100': '230 245 208',
		'--color-success-200': '224 242 197',
		'--color-success-300': '206 235 162',
		'--color-success-400': '169 219 92',
		'--color-success-500': '132 204 22',
		'--color-success-600': '119 184 20',
		'--color-success-700': '99 153 17',
		'--color-success-800': '79 122 13',
		'--color-success-900': '65 100 11',
		'--color-warning-50': '252 244 218',
		'--color-warning-100': '251 240 206',
		'--color-warning-200': '250 236 193',
		'--color-warning-300': '247 225 156',
		'--color-warning-400': '240 202 82',
		'--color-warning-500': '234 179 8',
		'--color-warning-600': '211 161 7',
		'--color-warning-700': '176 134 6',
		'--color-warning-800': '140 107 5',
		'--color-warning-900': '115 88 4',
		'--color-error-50': '249 221 234',
		'--color-error-100': '246 209 228',
		'--color-error-200': '244 198 221',
		'--color-error-300': '238 163 200',
		'--color-error-400': '225 94 159',
		'--color-error-500': '212 25 118',
		'--color-error-600': '191 23 106',
		'--color-error-700': '159 19 89',
		'--color-error-800': '127 15 71',
		'--color-error-900': '104 12 58',
		'--color-surface-50': '249 250 251',
		'--color-surface-100': '243 244 246',
		'--color-surface-200': '229 231 235',
		'--color-surface-300': '209 213 219',
		'--color-surface-400': '156 163 175',
		'--color-surface-500': '107 114 128',
		'--color-surface-600': '75 85 99',
		'--color-surface-700': '55 65 81',
		'--color-surface-800': '31 41 55',
		'--color-surface-900': '17 24 39'
	}
	// properties: {
	// 	// =~= Theme Properties =~=
	// 	'--theme-font-family-base': `system-ui`,
	// 	'--theme-font-family-heading': `system-ui`,
	// 	'--theme-font-color-base': 'var(--color-surface-500)',
	// 	'--theme-font-color-dark': '255 255 255',
	// 	'--theme-rounded-base': '9999px',
	// 	'--theme-rounded-container': '8px',
	// 	'--theme-border-base': '1px',
	// 	// =~= Theme On-X Colors =~=
	// 	'--on-primary': '255 255 255',
	// 	'--on-secondary': '255 255 255',
	// 	'--on-tertiary': 'var(--color-surface-500)',
	// 	'--on-success': 'var(--color-surface-500)',
	// 	'--on-warning': 'var(--color-surface-500)',
	// 	'--on-error': '255 255 255',
	// 	'--on-surface': '255 255 255',
	// 	// =~= Theme Colors  =~=
	// 	// primary | #7E0CF5
	// 	'--color-primary-50': '236 219 254', // #ecdbfe
	// 	'--color-primary-100': '229 206 253', // #e5cefd
	// 	'--color-primary-200': '223 194 253', // #dfc2fd
	// 	'--color-primary-300': '203 158 251', // #cb9efb
	// 	'--color-primary-400': '165 85 248', // #a555f8
	// 	'--color-primary-500': '126 12 245', // #7E0CF5
	// 	'--color-primary-600': '113 11 221', // #710bdd
	// 	'--color-primary-700': '95 9 184', // #5f09b8
	// 	'--color-primary-800': '76 7 147', // #4c0793
	// 	'--color-primary-900': '62 6 120', // #3e0678
	// 	// secondary | #C400C6
	// 	'--color-secondary-50': '246 217 246', // #f6d9f6
	// 	'--color-secondary-100': '243 204 244', // #f3ccf4
	// 	'--color-secondary-200': '240 191 241', // #f0bff1
	// 	'--color-secondary-300': '231 153 232', // #e799e8
	// 	'--color-secondary-400': '214 77 215', // #d64dd7
	// 	'--color-secondary-500': '196 0 198', // #C400C6
	// 	'--color-secondary-600': '176 0 178', // #b000b2
	// 	'--color-secondary-700': '147 0 149', // #930095
	// 	'--color-secondary-800': '118 0 119', // #760077
	// 	'--color-secondary-900': '96 0 97', // #600061
	// 	// tertiary | #F7BEFF
	// 	'--color-tertiary-50': '254 245 255', // #fef5ff
	// 	'--color-tertiary-100': '253 242 255', // #fdf2ff
	// 	'--color-tertiary-200': '253 239 255', // #fdefff
	// 	'--color-tertiary-300': '252 229 255', // #fce5ff
	// 	'--color-tertiary-400': '249 210 255', // #f9d2ff
	// 	'--color-tertiary-500': '247 190 255', // #F7BEFF
	// 	'--color-tertiary-600': '222 171 230', // #deabe6
	// 	'--color-tertiary-700': '185 143 191', // #b98fbf
	// 	'--color-tertiary-800': '148 114 153', // #947299
	// 	'--color-tertiary-900': '121 93 125', // #795d7d
	// 	// success | #75E371
	// 	'--color-success-50': '234 251 234', // #eafbea
	// 	'--color-success-100': '227 249 227', // #e3f9e3
	// 	'--color-success-200': '221 248 220', // #ddf8dc
	// 	'--color-success-300': '200 244 198', // #c8f4c6
	// 	'--color-success-400': '158 235 156', // #9eeb9c
	// 	'--color-success-500': '117 227 113', // #75E371
	// 	'--color-success-600': '105 204 102', // #69cc66
	// 	'--color-success-700': '88 170 85', // #58aa55
	// 	'--color-success-800': '70 136 68', // #468844
	// 	'--color-success-900': '57 111 55', // #396f37
	// 	// warning | #FF7526
	// 	'--color-warning-50': '255 234 222', // #ffeade
	// 	'--color-warning-100': '255 227 212', // #ffe3d4
	// 	'--color-warning-200': '255 221 201', // #ffddc9
	// 	'--color-warning-300': '255 200 168', // #ffc8a8
	// 	'--color-warning-400': '255 158 103', // #ff9e67
	// 	'--color-warning-500': '255 117 38', // #FF7526
	// 	'--color-warning-600': '230 105 34', // #e66922
	// 	'--color-warning-700': '191 88 29', // #bf581d
	// 	'--color-warning-800': '153 70 23', // #994617
	// 	'--color-warning-900': '125 57 19', // #7d3913
	// 	// error | #d20f29
	// 	'--color-error-50': '248 219 223', // #f8dbdf
	// 	'--color-error-100': '246 207 212', // #f6cfd4
	// 	'--color-error-200': '244 195 202', // #f4c3ca
	// 	'--color-error-300': '237 159 169', // #ed9fa9
	// 	'--color-error-400': '224 87 105', // #e05769
	// 	'--color-error-500': '210 15 41', // #d20f29
	// 	'--color-error-600': '189 14 37', // #bd0e25
	// 	'--color-error-700': '158 11 31', // #9e0b1f
	// 	'--color-error-800': '126 9 25', // #7e0919
	// 	'--color-error-900': '103 7 20', // #670714
	// 	// surface | #090057
	// 	'--color-surface-50': '254 250 255', // #dfe0e2
	// 	'--color-surface-100': '253 245 255', // #fdf5ff
	// 	'--color-surface-200': '250 229 255', // #fae5ff
	// 	'--color-surface-300': '247 214 255', // #f7d6ff
	// 	'--color-surface-400': '243 194 255', // #f3c2ff
	// 	'--color-surface-500': '9 0 87', // #090057
	// 	'--color-surface-600': '8 0 78', // #08004e

	// 	'--color-surface-700': '7 0 51', // #070033 05012a /* "7 0 65", // #070041 */
	// 	'--color-surface-800': '5 0 36', // #050024  /* "5 0 52", // #050034 */
	// 	'--color-surface-900': '2 0 28' // #02001c  /* "4 0 43", // #04002b */
	// }
};
