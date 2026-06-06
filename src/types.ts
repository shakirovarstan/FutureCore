/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: "all" | "english" | "math" | "ai";
  location: string;
  criteria: string[];
  image: string;
  urgent: boolean;
  schedule: string;
  commitment: string;
  tags: string[];
}

export interface Application {
  id: string;
  projectId: string;
  projectName: string;
  projectImage: string;
  fullName: string;
  email: string;
  phone: string;
  motivation: string;
  availability: string[];
  documents: {
    id: string;
    name: string;
    type: string;
    size: string;
    url?: string;
  }[];
  googleFormsUrl?: string;
  volunteerAge?: string;
  childInfo?: string;
  status: "draft" | "submitted" | "approved" | "pending" | "rejected";
  step: number; // 1, 2, 3
  createdAt: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}
