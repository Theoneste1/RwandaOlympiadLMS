// PLACEHOLDER CONTENT — fictional sample schools so the directory has data to
// render. Do NOT treat these as real participating schools; replace with a
// verified list (or connect to the database) before launch.

export type School = {
  id: string;
  name: string;
  province: string;
  district: string;
  level: "Primary" | "Secondary" | "Primary & Secondary";
};

export const SCHOOLS: School[] = [
  { id: "sch-1", name: "Kigali Sample Academy", province: "Kigali City", district: "Kicukiro", level: "Primary & Secondary" },
  { id: "sch-2", name: "Huye Model Secondary School (sample)", province: "Southern Province", district: "Huye", level: "Secondary" },
  { id: "sch-3", name: "Musanze Sample Primary School", province: "Northern Province", district: "Musanze", level: "Primary" },
  { id: "sch-4", name: "Rubavu Community School (sample)", province: "Western Province", district: "Rubavu", level: "Primary & Secondary" },
  { id: "sch-5", name: "Rwamagana Sample Secondary School", province: "Eastern Province", district: "Rwamagana", level: "Secondary" },
];
