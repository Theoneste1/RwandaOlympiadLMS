// PLACEHOLDER CONTENT — sample exam center listings. Provinces/districts are
// real Rwandan administrative divisions; center names and addresses are
// fictional placeholders and must be replaced with confirmed venues.

export type ExamCenter = {
  id: string;
  name: string;
  province: string;
  district: string;
  capacity: number;
  contactEmail: string;
};

export const EXAM_CENTERS: ExamCenter[] = [
  { id: "ec-1", name: "Kigali Examination Center A", province: "Kigali City", district: "Gasabo", capacity: 300, contactEmail: "kigali-a@rwandaolympiad.example" },
  { id: "ec-2", name: "Kigali Examination Center B", province: "Kigali City", district: "Nyarugenge", capacity: 220, contactEmail: "kigali-b@rwandaolympiad.example" },
  { id: "ec-3", name: "Huye Examination Center", province: "Southern Province", district: "Huye", capacity: 180, contactEmail: "huye@rwandaolympiad.example" },
  { id: "ec-4", name: "Musanze Examination Center", province: "Northern Province", district: "Musanze", capacity: 150, contactEmail: "musanze@rwandaolympiad.example" },
  { id: "ec-5", name: "Rubavu Examination Center", province: "Western Province", district: "Rubavu", capacity: 140, contactEmail: "rubavu@rwandaolympiad.example" },
  { id: "ec-6", name: "Rwamagana Examination Center", province: "Eastern Province", district: "Rwamagana", capacity: 160, contactEmail: "rwamagana@rwandaolympiad.example" },
];
