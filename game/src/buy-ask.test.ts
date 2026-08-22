import { describe, expect, it } from "vitest";
import { askMoney, buyAskModel, landAskModel, unitAskModel } from "../public/harbour/buy-ask.js";

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
      priceLabel: "$242",
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

  it("asks for a cart pad by that name", () => {
    const model = buyAskModel({
      id: "south-cart-0",
      name: "Cart pad · Island Hwy",
      price: 750,
      owner: null,
      class: "cart_pad",
    });
    expect(model?.question).toBe("Do you want to buy this cart pad?");
    expect(model?.priceLabel).toBe("$750");
  });

  it("asks before a vacant room is bought", () => {
    const model = unitAskModel({
      id: "strand-flats-0-0",
      label: "Strand flat G-L",
      price: 900,
      owner: null,
      use: "apartment",
    });
    expect(model?.question).toBe("Buy Strand flat G-L for $900?");
    expect(model?.yes).toBe("Yes, buy");
    expect(unitAskModel({ id: "x", owner: "visitor", price: 900, label: "Taken" })).toBeNull();
  });

  it("asks for landlord dirt with honest cannot-afford copy", () => {
    const model = landAskModel({ id: "quay-shops", name: "Quay Shops", landPrice: 15000, landOwner: null }, 10000);
    expect(model?.question).toBe("Buy the dirt under Quay Shops for $15,000?");
    expect(model?.name).toMatch(/do not need this/i);
    expect(model?.disabled).toBe(true);
    expect(model?.yes).toBe("Need $15,000");
    const rich = landAskModel({ id: "quay-shops", name: "Quay Shops", landPrice: 15000, landOwner: null }, 15000);
    expect(rich?.disabled).toBe(false);
    expect(rich?.yes).toBe("Yes, buy");
    expect(landAskModel({ landOwner: "visitor", name: "Quay Shops", landPrice: 15000 })).toBeNull();
  });
});
