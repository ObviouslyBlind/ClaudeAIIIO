import { describe, expect, it } from "vitest";
import { askMoney, buyAskModel } from "../public/harbour/buy-ask.js";

describe("buy-ask (PAPER)", () => {
  it("asks before a vacant lot is bought", () => {
    const model = buyAskModel({
      id: "south-street-0",
      name: "14 Harbour Rd",
      price: 242,
      owner: null,
    });
    expect(model).toEqual({
      question: "Do you want to buy this lot?",
      name: "14 Harbour Rd",
      priceLabel: "$242 PAPER",
      yes: "Yes, buy",
      no: "No",
    });
    expect(askMoney(1121)).toBe("$1,121");
  });

  it("does not ask for taken or yours", () => {
    expect(buyAskModel({ id: "a", price: 10, owner: "npc" })).toBeNull();
    expect(buyAskModel({ id: "b", price: 10, owner: "visitor" })).toBeNull();
    expect(buyAskModel(null)).toBeNull();
  });
});
