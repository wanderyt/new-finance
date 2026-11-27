import type { CategoryPair } from "./receipt-categories";

// Each child has an expense category with the child's nickname and a person with the child's name.
export const CHILDREN = [
  { category: "骐骐", personName: "Robin", gender: "boy", birthYear: 2014 },
  { category: "慢慢", personName: "Luna", gender: "girl", birthYear: 2022 },
] as const;

/** Tells whether the person name belongs to a child. */
export const isChild = (name: string) => CHILDREN.some((child) => child.personName === name);

/** Returns the person of the child that owns the category, or undefined for other categories. */
export function childPersonId(category: string | null | undefined, persons: Array<{ personId: number; name: string }>) {
  const child = CHILDREN.find((entry) => entry.category === category);
  return child && persons.find((person) => person.name === child.personName)?.personId;
}

/** Tells the receipt model who each child category is for. Lists only the children that the user has pairs for. */
export function buildChildrenPrompt(pairs: CategoryPair[]): string {
  const children = CHILDREN.filter((child) => pairs.some((pair) => pair.category === child.category));
  if (!children.length) return "";
  return `
Children:
${children.map((child) => `- ${child.category} is ${child.personName}, a ${child.gender} born in ${child.birthYear}.`).join("\n")}
- Calculate each child's age from the receipt date.
- A product made for children always uses a pair of one child. Examples: children's vitamins, diapers, toys, kids' clothes, and junior sports gear.
- Select the child whose age and gender fit the product best. If more than one child fits equally, select the youngest child.
- Use the normal pairs for items that the family shares, such as groceries and household goods.
`;
}
