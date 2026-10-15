import { describe, expect, it } from "vitest";
import { cnpjValido, formatarCnpj, normalizarCnpj } from "./cnpj";

describe("CNPJ", () => {
  it.each(["11.222.333/0001-81", "11222333000181", "12.ABC.345/01DE-35", "12abc34501de35"])("válido: %s", (c) => {
    expect(cnpjValido(c)).toBe(true);
  });

  it.each(["11.222.333/0001-82", "00000000000000", "1122233300018", "", "12.ABC.345/01DE-36", "AB.CDE.FGH/IJKL-MN"])(
    "inválido: %j",
    (c) => {
      expect(cnpjValido(c)).toBe(false);
    },
  );

  it("normaliza e formata", () => {
    expect(normalizarCnpj("12.abc.345/01de-35")).toBe("12ABC34501DE35");
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarCnpj("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
  });
});
