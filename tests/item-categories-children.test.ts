import assert from "node:assert/strict";
import { test } from "node:test";
import { buildChildrenPrompt, childPersonId, isChild } from "../app/lib/utils/children";

const persons = [
  { personId: 1, name: "Robin" },
  { personId: 4, name: "Luna" },
  { personId: 5, name: "Family" },
];

test("a child category maps to the child's person and other categories map to nothing", () => {
  assert.equal(childPersonId("骐骐", persons), 1);
  assert.equal(childPersonId("慢慢", persons), 4);
  assert.equal(childPersonId("生活", persons), undefined);
  assert.equal(childPersonId(null, persons), undefined);
  assert.equal(childPersonId("慢慢", [{ personId: 5, name: "Family" }]), undefined);
  assert.equal(isChild("Luna"), true);
  assert.equal(isChild("Family"), false);
});

test("the prompt describes only the children that the user has pairs for", () => {
  const prompt = buildChildrenPrompt([{ category: "骐骐", subcategory: "玩具" }, { category: "生活", subcategory: "水果" }]);
  assert.match(prompt, /骐骐 is Robin, a boy born in 2014\./);
  assert.doesNotMatch(prompt, /慢慢/);
  assert.match(prompt, /A product made for children always uses a pair of one child\./);
  assert.equal(buildChildrenPrompt([{ category: "生活", subcategory: "水果" }]), "");
});
