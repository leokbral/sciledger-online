// Scopus subject areas and classifications
export interface ScopusSubArea {
    code: string;
    name: string;
}

export interface ScopusArea {
    name: string;
    subAreas: ScopusSubArea[];
}

export const SCOPUS_AREAS: ScopusArea[] = [
    {
        name: "Agricultural and Biological Sciences",
        subAreas: [
            { code: "1100", name: "Agricultural and Biological Sciences (miscellaneous)" },
            { code: "1101", name: "Agronomy and Crop Science" },
            { code: "1102", name: "Animal Science and Zoology" },
            { code: "1103", name: "Aquatic Science" },
            { code: "1104", name: "Ecology, Evolution, Behavior and Systematics" },
            { code: "1105", name: "Food Science" },
            { code: "1106", name: "Forestry" },
            { code: "1107", name: "General Agricultural and Biological Sciences" },
            { code: "1108", name: "Horticulture" },
            { code: "1109", name: "Insect Science" },
            { code: "1110", name: "Plant Science" },
            { code: "1111", name: "Soil Science" }
        ]
    },
    {
        name: "Arts and Humanities",
        subAreas: [
            { code: "1200", name: "Archeology (arts and humanities)" },
            { code: "1201", name: "Arts and Humanities (miscellaneous)" },
            { code: "1202", name: "Classics" },
            { code: "1203", name: "Conservation" },
            { code: "1204", name: "General Arts and Humanities" },
            { code: "1205", name: "History" },
            { code: "1206", name: "History and Philosophy of Science" },
            { code: "1207", name: "Language and Linguistics" },
            { code: "1208", name: "Literature and Literary Theory" },
            { code: "1209", name: "Museology" },
            { code: "1210", name: "Music" },
            { code: "1211", name: "Philosophy" },
            { code: "1212", name: "Religious Studies" },
            { code: "1213", name: "Visual Arts and Performing Arts" }
        ]
    },
    {
        name: "Biochemistry, Genetics and Molecular Biology",
        subAreas: [
            { code: "1300", name: "Aging" },
            { code: "1301", name: "Biochemistry" },
            { code: "1302", name: "Biochemistry, Genetics and Molecular Biology (miscellaneous)" },
            { code: "1303", name: "Biophysics" },
            { code: "1304", name: "Biotechnology" },
            { code: "1305", name: "Cancer Research" },
            { code: "1306", name: "Cell Biology" },
            { code: "1307", name: "Clinical Biochemistry" },
            { code: "1308", name: "Developmental Biology" },
            { code: "1309", name: "Endocrinology" },
            { code: "1310", name: "General Biochemistry, Genetics and Molecular Biology" },
            { code: "1311", name: "Genetics" },
            { code: "1312", name: "Molecular Biology" },
            { code: "1313", name: "Molecular Medicine" },
            { code: "1314", name: "Physiology" },
            { code: "1315", name: "Structural Biology" }
        ]
    },
    {
        name: "Business, Management and Accounting",
        subAreas: [
            { code: "1400", name: "Accounting" },
            { code: "1401", name: "Business and International Management" },
            { code: "1402", name: "Business, Management and Accounting (miscellaneous)" },
            { code: "1403", name: "General Business, Management and Accounting" },
            { code: "1404", name: "Industrial Relations" },
            { code: "1405", name: "Management Information Systems" },
            { code: "1406", name: "Management of Technology and Innovation" },
            { code: "1407", name: "Marketing" },
            { code: "1408", name: "Organizational Behavior and Human Resource Management" },
            { code: "1409", name: "Strategy and Management" },
            { code: "1410", name: "Tourism, Leisure and Hospitality Management" }
        ]
    },
    {
        name: "Chemical Engineering",
        subAreas: [
            { code: "1500", name: "Bioengineering" },
            { code: "1501", name: "Catalysis" },
            { code: "1502", name: "Chemical Engineering (miscellaneous)" },
            { code: "1503", name: "Chemical Health and Safety" },
            { code: "1504", name: "Colloid and Surface Chemistry" },
            { code: "1505", name: "Filtration and Separation" },
            { code: "1506", name: "Fluid Flow and Transfer Processes" },
            { code: "1507", name: "General Chemical Engineering" },
            { code: "1508", name: "Process Chemistry and Technology" }
        ]
    },
    {
        name: "Chemistry",
        subAreas: [
            { code: "1600", name: "Analytical Chemistry" },
            { code: "1601", name: "Chemistry (miscellaneous)" },
            { code: "1602", name: "Electrochemistry" },
            { code: "1603", name: "General Chemistry" },
            { code: "1604", name: "Inorganic Chemistry" },
            { code: "1605", name: "Organic Chemistry" },
            { code: "1606", name: "Physical and Theoretical Chemistry" },
            { code: "1607", name: "Spectroscopy" }
        ]
    },
    {
        name: "Computer Science",
        subAreas: [
            { code: "1700", name: "Artificial Intelligence" },
            { code: "1701", name: "Computational Theory and Mathematics" },
            { code: "1702", name: "Computer Graphics and Computer-Aided Design" },
            { code: "1703", name: "Computer Networks and Communications" },
            { code: "1704", name: "Computer Science (miscellaneous)" },
            { code: "1705", name: "Computer Science Applications" },
            { code: "1706", name: "Computer Vision and Pattern Recognition" },
            { code: "1707", name: "General Computer Science" },
            { code: "1708", name: "Hardware and Architecture" },
            { code: "1709", name: "Human-Computer Interaction" },
            { code: "1710", name: "Information Systems" },
            { code: "1711", name: "Signal Processing" },
            { code: "1712", name: "Software" }
        ]
    },
    {
        name: "Decision Sciences",
        subAreas: [
            { code: "1800", name: "Decision Sciences (miscellaneous)" },
            { code: "1801", name: "General Decision Sciences" },
            { code: "1802", name: "Information Systems and Management" },
            { code: "1803", name: "Management Science and Operations Research" },
            { code: "1804", name: "Statistics, Probability and Uncertainty" }
        ]
    },
    {
        name: "Dentistry",
        subAreas: [
            { code: "1900", name: "Dental Assisting" },
            { code: "1901", name: "Dental Hygiene" },
            { code: "1902", name: "Dentistry (miscellaneous)" },
            { code: "1903", name: "General Dentistry" },
            { code: "1904", name: "Oral Surgery" },
            { code: "1905", name: "Orthodontics" },
            { code: "1906", name: "Periodontics" }
        ]
    },
    {
        name: "Earth and Planetary Sciences",
        subAreas: [
            { code: "1900", name: "Atmospheric Science" },
            { code: "1901", name: "Computers in Earth Sciences" },
            { code: "1902", name: "Earth and Planetary Sciences (miscellaneous)" },
            { code: "1903", name: "Earth-Surface Processes" },
            { code: "1904", name: "Economic Geology" },
            { code: "1905", name: "General Earth and Planetary Sciences" },
            { code: "1906", name: "Geochemistry and Petrology" },
            { code: "1907", name: "Geology" },
            { code: "1908", name: "Geophysics" },
            { code: "1909", name: "Geotechnical Engineering and Engineering Geology" },
            { code: "1910", name: "Oceanography" },
            { code: "1911", name: "Paleontology" },
            { code: "1912", name: "Space and Planetary Science" },
            { code: "1913", name: "Stratigraphy" }
        ]
    },
    {
        name: "Economics, Econometrics and Finance",
        subAreas: [
            { code: "2000", name: "Economics and Econometrics" },
            { code: "2001", name: "Economics, Econometrics and Finance (miscellaneous)" },
            { code: "2002", name: "Finance" },
            { code: "2003", name: "General Economics, Econometrics and Finance" }
        ]
    },
    {
        name: "Energy",
        subAreas: [
            { code: "2100", name: "Energy (miscellaneous)" },
            { code: "2101", name: "Energy Engineering and Power Technology" },
            { code: "2102", name: "Fuel Technology" },
            { code: "2103", name: "General Energy" },
            { code: "2104", name: "Nuclear Energy and Engineering" },
            { code: "2105", name: "Renewable Energy, Sustainability and the Environment" }
        ]
    },
    {
        name: "Engineering",
        subAreas: [
            { code: "2200", name: "Aerospace Engineering" },
            { code: "2201", name: "Architecture" },
            { code: "2202", name: "Automotive Engineering" },
            { code: "2203", name: "Biomedical Engineering" },
            { code: "2204", name: "Building and Construction" },
            { code: "2205", name: "Civil and Structural Engineering" },
            { code: "2206", name: "Computational Mechanics" },
            { code: "2207", name: "Control and Systems Engineering" },
            { code: "2208", name: "Electrical and Electronic Engineering" },
            { code: "2209", name: "Engineering (miscellaneous)" },
            { code: "2210", name: "General Engineering" },
            { code: "2211", name: "Industrial and Manufacturing Engineering" },
            { code: "2212", name: "Mechanical Engineering" },
            { code: "2213", name: "Mechanics of Materials" },
            { code: "2214", name: "Media Technology" },
            { code: "2215", name: "Ocean Engineering" },
            { code: "2216", name: "Safety, Risk, Reliability and Quality" }
        ]
    },
    {
        name: "Environmental Science",
        subAreas: [
            { code: "2300", name: "Ecological Modeling" },
            { code: "2301", name: "Ecology" },
            { code: "2302", name: "Environmental Chemistry" },
            { code: "2303", name: "Environmental Engineering" },
            { code: "2304", name: "Environmental Science (miscellaneous)" },
            { code: "2305", name: "General Environmental Science" },
            { code: "2306", name: "Global and Planetary Change" },
            { code: "2307", name: "Health, Toxicology and Mutagenesis" },
            { code: "2308", name: "Management, Monitoring, Policy and Law" },
            { code: "2309", name: "Nature and Landscape Conservation" },
            { code: "2310", name: "Pollution" },
            { code: "2311", name: "Waste Management and Disposal" },
            { code: "2312", name: "Water Science and Technology" }
        ]
    },
    {
        name: "Health Professions",
        subAreas: [
            { code: "3600", name: "Chiropractics" },
            { code: "3601", name: "Complementary and Manual Therapy" },
            { code: "3602", name: "Emergency Medical Services" },
            { code: "3603", name: "General Health Professions" },
            { code: "3604", name: "Health Information Management" },
            { code: "3605", name: "Health Professions (miscellaneous)" },
            { code: "3606", name: "Medical Assisting and Transcription" },
            { code: "3607", name: "Medical Laboratory Technology" },
            { code: "3608", name: "Medical Terminology" },
            { code: "3609", name: "Occupational Therapy" },
            { code: "3610", name: "Optometry" },
            { code: "3611", name: "Pharmacy" },
            { code: "3612", name: "Physical Therapy, Sports Therapy and Rehabilitation" },
            { code: "3613", name: "Podiatry" },
            { code: "3614", name: "Radiological and Ultrasound Technology" },
            { code: "3615", name: "Respiratory Care" },
            { code: "3616", name: "Speech and Hearing" }
        ]
    },
    {
        name: "Immunology and Microbiology",
        subAreas: [
            { code: "2400", name: "Applied Microbiology and Biotechnology" },
            { code: "2401", name: "General Immunology and Microbiology" },
            { code: "2402", name: "Immunology" },
            { code: "2403", name: "Immunology and Microbiology (miscellaneous)" },
            { code: "2404", name: "Microbiology" },
            { code: "2405", name: "Parasitology" },
            { code: "2406", name: "Virology" }
        ]
    },
    {
        name: "Materials Science",
        subAreas: [
            { code: "2500", name: "Biomaterials" },
            { code: "2501", name: "Ceramics and Composites" },
            { code: "2502", name: "Electronic, Optical and Magnetic Materials" },
            { code: "2503", name: "General Materials Science" },
            { code: "2504", name: "Materials Chemistry" },
            { code: "2505", name: "Materials Science (miscellaneous)" },
            { code: "2506", name: "Metals and Alloys" },
            { code: "2507", name: "Polymers and Plastics" },
            { code: "2508", name: "Surfaces, Coatings and Films" }
        ]
    },
    {
        name: "Mathematics",
        subAreas: [
            { code: "2600", name: "Algebra and Number Theory" },
            { code: "2601", name: "Analysis" },
            { code: "2602", name: "Applied Mathematics" },
            { code: "2603", name: "Computational Mathematics" },
            { code: "2604", name: "Control and Optimization" },
            { code: "2605", name: "Discrete Mathematics and Combinatorics" },
            { code: "2606", name: "General Mathematics" },
            { code: "2607", name: "Geometry and Topology" },
            { code: "2608", name: "Logic" },
            { code: "2609", name: "Mathematical Physics" },
            { code: "2610", name: "Mathematics (miscellaneous)" },
            { code: "2611", name: "Modeling and Simulation" },
            { code: "2612", name: "Numerical Analysis" },
            { code: "2613", name: "Statistics and Probability" },
            { code: "2614", name: "Theoretical Computer Science" }
        ]
    },
    {
        name: "Medicine",
        subAreas: [
            { code: "2700", name: "Anatomy" },
            { code: "2701", name: "Anesthesiology and Pain Medicine" },
            { code: "2702", name: "Biochemistry (medical)" },
            { code: "2703", name: "Cardiology and Cardiovascular Medicine" },
            { code: "2704", name: "Complementary and Alternative Medicine" },
            { code: "2705", name: "Critical Care and Intensive Care Medicine" },
            { code: "2706", name: "Dermatology" },
            { code: "2707", name: "Drug Guides" },
            { code: "2708", name: "Embryology" },
            { code: "2709", name: "Emergency Medicine" },
            { code: "2710", name: "Endocrinology, Diabetes and Metabolism" },
            { code: "2711", name: "Epidemiology" },
            { code: "2712", name: "Family Practice" },
            { code: "2713", name: "Gastroenterology" },
            { code: "2714", name: "General Medicine" },
            { code: "2715", name: "Genetics (clinical)" },
            { code: "2716", name: "Geriatrics and Gerontology" },
            { code: "2717", name: "Health Informatics" },
            { code: "2718", name: "Health Policy" },
            { code: "2719", name: "Hematology" },
            { code: "2720", name: "Hepatology" },
            { code: "2721", name: "Histology" },
            { code: "2722", name: "Immunology and Allergy" },
            { code: "2723", name: "Infectious Diseases" },
            { code: "2724", name: "Internal Medicine" },
            { code: "2725", name: "Medicine (miscellaneous)" },
            { code: "2726", name: "Microbiology (medical)" },
            { code: "2727", name: "Nephrology" },
            { code: "2728", name: "Neurology (clinical)" },
            { code: "2729", name: "Obstetrics and Gynecology" },
            { code: "2730", name: "Oncology" },
            { code: "2731", name: "Ophthalmology" },
            { code: "2732", name: "Orthopedics and Sports Medicine" },
            { code: "2733", name: "Otorhinolaryngology" },
            { code: "2734", name: "Pathology and Forensic Medicine" },
            { code: "2735", name: "Pediatrics, Perinatology and Child Health" },
            { code: "2736", name: "Pharmacology (medical)" },
            { code: "2737", name: "Physiology (medical)" },
            { code: "2738", name: "Psychiatry and Mental Health" },
            { code: "2739", name: "Public Health, Environmental and Occupational Health" },
            { code: "2740", name: "Pulmonary and Respiratory Medicine" },
            { code: "2741", name: "Radiology, Nuclear Medicine and Imaging" },
            { code: "2742", name: "Rehabilitation" },
            { code: "2743", name: "Reproductive Medicine" },
            { code: "2744", name: "Reviews and References (medical)" },
            { code: "2745", name: "Rheumatology" },
            { code: "2746", name: "Surgery" },
            { code: "2747", name: "Transplantation" },
            { code: "2748", name: "Urology" }
        ]
    },
    {
        name: "Multidisciplinary",
        subAreas: [
            { code: "1000", name: "Multidisciplinary" }
        ]
    },
    {
        name: "Neuroscience",
        subAreas: [
            { code: "2800", name: "Behavioral Neuroscience" },
            { code: "2801", name: "Biological Psychiatry" },
            { code: "2802", name: "Cellular and Molecular Neuroscience" },
            { code: "2803", name: "Cognitive Neuroscience" },
            { code: "2804", name: "Developmental Neuroscience" },
            { code: "2805", name: "Endocrine and Autonomic Systems" },
            { code: "2806", name: "General Neuroscience" },
            { code: "2807", name: "Neurology" },
            { code: "2808", name: "Neuroscience (miscellaneous)" },
            { code: "2809", name: "Sensory Systems" }
        ]
    },
    {
        name: "Nursing",
        subAreas: [
            { code: "2900", name: "Advanced and Specialized Nursing" },
            { code: "2901", name: "Assessment and Diagnosis" },
            { code: "2902", name: "Care Planning" },
            { code: "2903", name: "Community and Home Care" },
            { code: "2904", name: "Critical Care Nursing" },
            { code: "2905", name: "Emergency Nursing" },
            { code: "2906", name: "Fundamentals and Skills" },
            { code: "2907", name: "General Nursing" },
            { code: "2908", name: "Gerontology" },
            { code: "2909", name: "Issues, Ethics and Legal Aspects" },
            { code: "2910", name: "LPN and LVN" },
            { code: "2911", name: "Leadership and Management" },
            { code: "2912", name: "Maternity and Midwifery" },
            { code: "2913", name: "Medical and Surgical Nursing" },
            { code: "2914", name: "Nurse Assisting" },
            { code: "2915", name: "Nursing (miscellaneous)" },
            { code: "2916", name: "Nutrition and Dietetics" },
            { code: "2917", name: "Oncology (nursing)" },
            { code: "2918", name: "Pathophysiology" },
            { code: "2919", name: "Pediatrics" },
            { code: "2920", name: "Pharmacology (nursing)" },
            { code: "2921", name: "Psychiatric Mental Health" },
            { code: "2922", name: "Research and Theory" },
            { code: "2923", name: "Review and Exam Preparation" }
        ]
    },
    {
        name: "Pharmacology, Toxicology and Pharmaceutics",
        subAreas: [
            { code: "3000", name: "Drug Discovery" },
            { code: "3001", name: "General Pharmacology, Toxicology and Pharmaceutics" },
            { code: "3002", name: "Pharmaceutical Science" },
            { code: "3003", name: "Pharmacology" },
            { code: "3004", name: "Pharmacology, Toxicology and Pharmaceutics (miscellaneous)" },
            { code: "3005", name: "Toxicology" }
        ]
    },
    {
        name: "Physics and Astronomy",
        subAreas: [
            { code: "3100", name: "Acoustics and Ultrasonics" },
            { code: "3101", name: "Astronomy and Astrophysics" },
            { code: "3102", name: "Atomic and Molecular Physics, and Optics" },
            { code: "3103", name: "Condensed Matter Physics" },
            { code: "3104", name: "General Physics and Astronomy" },
            { code: "3105", name: "Instrumentation" },
            { code: "3106", name: "Nuclear and High Energy Physics" },
            { code: "3107", name: "Physics and Astronomy (miscellaneous)" },
            { code: "3108", name: "Radiation" },
            { code: "3109", name: "Statistical and Nonlinear Physics" },
            { code: "3110", name: "Surfaces and Interfaces" }
        ]
    },
    {
        name: "Psychology",
        subAreas: [
            { code: "3200", name: "Applied Psychology" },
            { code: "3201", name: "Clinical Psychology" },
            { code: "3202", name: "Developmental and Educational Psychology" },
            { code: "3203", name: "Experimental and Cognitive Psychology" },
            { code: "3204", name: "General Psychology" },
            { code: "3205", name: "Neuropsychology and Physiological Psychology" },
            { code: "3206", name: "Psychology (miscellaneous)" },
            { code: "3207", name: "Social Psychology" }
        ]
    },
    {
        name: "Social Sciences",
        subAreas: [
            { code: "3300", name: "Anthropology" },
            { code: "3301", name: "Archeology" },
            { code: "3302", name: "Communication" },
            { code: "3303", name: "Cultural Studies" },
            { code: "3304", name: "Demography" },
            { code: "3305", name: "Development" },
            { code: "3306", name: "Education" },
            { code: "3307", name: "Gender Studies" },
            { code: "3308", name: "General Social Sciences" },
            { code: "3309", name: "Geography, Planning and Development" },
            { code: "3310", name: "Health (social science)" },
            { code: "3311", name: "Human Factors and Ergonomics" },
            { code: "3312", name: "Law" },
            { code: "3313", name: "Library and Information Sciences" },
            { code: "3314", name: "Life-span and Life-course Studies" },
            { code: "3315", name: "Linguistics and Language" },
            { code: "3316", name: "Political Science and International Relations" },
            { code: "3317", name: "Public Administration" },
            { code: "3318", name: "Safety Research" },
            { code: "3319", name: "Social Sciences (miscellaneous)" },
            { code: "3320", name: "Sociology and Political Science" },
            { code: "3321", name: "Transportation" },
            { code: "3322", name: "Urban Studies" }
        ]
    },
    {
        name: "Veterinary",
        subAreas: [
            { code: "3400", name: "Equine" },
            { code: "3401", name: "Food Animals" },
            { code: "3402", name: "General Veterinary" },
            { code: "3403", name: "Small Animals" },
            { code: "3404", name: "Veterinary (miscellaneous)" }
        ]
    }
];

// Helper function to get sub-areas for a specific area
export function getSubAreasForArea(areaName: string): ScopusSubArea[] {
    const area = SCOPUS_AREAS.find(a => a.name === areaName);
    return area ? area.subAreas : [];
}

// Helper function to get all area names
export function getAllAreaNames(): string[] {
    return SCOPUS_AREAS.map(area => area.name);
}
