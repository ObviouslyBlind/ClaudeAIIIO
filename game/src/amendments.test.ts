import { describe, expect, it } from "vitest";
import { FIRST_GENERAL_DAY, TICKS_PER_SIM_DAY } from "./calendar.ts";
import { createWorld, fastForward } from "./sim.ts";
import { salesTaxRate } from "./statutes.ts";
import { passMoneyBill, tableMoneyBill } from "./amendments.ts";

function dayTick(day: number): number {
  return day * TICKS_PER_SIM_DAY;
}

describe("PAPER House money bills step H", () => {
  it("tables a PAPER sales-tax slider bill without writing the live rate", () => {
    const world = createWorld(3);
    expect(salesTaxRate(world.statutes)).toBe(0);

    const bill = tableMoneyBill({ statuteId: "sales_tax", slider: "rate", value: 0.05 });
    expect(bill.statuteId).toBe("sales_tax");
    expect(bill.slider).toBe("rate");
    expect(bill.value).toBe(0.05);
    expect(bill.mode).toBe("PAPER");
    expect(bill.provenance).toBe("SIMULATED");
    expect(bill.note).toMatch(/PAPER/);
    expect(salesTaxRate(world.statutes)).toBe(0);
  });

  it("writes the live rate only after the day-14 House can originate", () => {
    expect(FIRST_GENERAL_DAY).toBe(14);
    const world = createWorld(5);
    const bill = tableMoneyBill({ statuteId: "sales_tax", slider: "rate", value: 0.05 });

    const vacant = passMoneyBill({ statutes: world.statutes, tick: dayTick(13) }, bill);
    expect(vacant.ok).toBe(false);
    if (!vacant.ok) expect(vacant.reason).toBe("cannot_originate");
    expect(salesTaxRate(world.statutes)).toBe(0);

    const passed = passMoneyBill({ statutes: world.statutes, tick: dayTick(14) }, bill);
    expect(passed.ok).toBe(true);
    expect(salesTaxRate(world.statutes)).toBeCloseTo(0.05);
  });

  it("sinks sales tax on a real createWorld after House passage vs rate 0", () => {
    const taxed = createWorld(7);
    const control = createWorld(7);
    const bill = tableMoneyBill({ statuteId: "sales_tax", slider: "rate", value: 0.05 });

    const passed = passMoneyBill({ statutes: taxed.statutes, tick: dayTick(14) }, bill);
    expect(passed.ok).toBe(true);
    expect(salesTaxRate(taxed.statutes)).toBeCloseTo(0.05);
    expect(salesTaxRate(control.statutes)).toBe(0);

    fastForward(taxed, 40);
    fastForward(control, 40);
    expect(control.ledger.sink).toBe(0);
    expect(taxed.ledger.sink).toBeGreaterThan(control.ledger.sink);
  });
});
