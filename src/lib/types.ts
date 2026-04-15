export interface Session {
  id: string;
  code: string;
  status: "registration" | "evaluating" | "results" | "closed";
  created_at: string;
  updated_at: string;
}

export interface LanguageEntry {
  language: string;
  level: string;
}

export interface Candidate {
  id: string;
  session_id: string;
  display_id: string | null;
  name: string;
  age: number | null;
  gender: string | null;
  department: string | null;
  education_school: string | null;
  education_field: string | null;
  last_company: string | null;
  experience_total: number;
  experience_field: number;
  languages: LanguageEntry[];
  competencies: string[];
  computer_skills: string[];
  strengths: string[];
  weaknesses: string[];
  salary_expectation: number;
  profile_completed: boolean;
  created_at: string;
}

export interface Matching {
  id: string;
  session_id: string;
  evaluator_id: string;
  candidate_id: string;
  offered_salary: number | null;
  evaluated_at: string | null;
  created_at: string;
}
