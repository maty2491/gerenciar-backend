import test from "node:test"
import assert from "node:assert/strict"
import {
    buildSearchRegex,
    ensureOperativeSector,
    normalizeActivityPayload,
    normalizeSubactivityPayload,
    parseBooleanQuery,
    parsePagination,
    resolveSectorScope
} from "./activityModule.js"

test("parsePagination aplica page=1 y limit=20 por defecto", () => {
    const result = parsePagination({})

    assert.equal(result.page, 1)
    assert.equal(result.limit, 20)
    assert.equal(result.skip, 0)
})

test("parsePagination limita el maximo a 100", () => {
    const result = parsePagination({ page: "2", limit: "999" })

    assert.equal(result.page, 2)
    assert.equal(result.limit, 100)
    assert.equal(result.skip, 100)
})

test("resolveSectorScope fuerza el sector del encargado", () => {
    const result = resolveSectorScope({
        user: { role: "encargado", sector: "cordoba" },
        requestedSector: "santa fe"
    })

    assert.equal(result, "cordoba")
})

test("resolveSectorScope exige sector explicito para admin cuando corresponde", () => {
    assert.throws(() => resolveSectorScope({
        user: { role: "administrador" },
        requestedSector: undefined,
        requireExplicitAdminSector: true
    }), /sector es obligatorio/i)
})

test("normalize payloads convierte textos a lowercase y trim", () => {
    const activity = normalizeActivityPayload({
        sector: " Cordoba ",
        name: " Embargos Judiciales ",
        description: "  Texto  "
    })
    const subactivity = normalizeSubactivityPayload({
        sector: " Santa Fe ",
        name: " Marca De Embargo ",
        description: " Otra descripcion "
    })

    assert.deepEqual(activity, {
        sector: "cordoba",
        name: "embargos judiciales",
        description: "Texto"
    })
    assert.deepEqual(subactivity, {
        sector: "santa fe",
        name: "marca de embargo",
        description: "Otra descripcion"
    })
})

test("parseBooleanQuery interpreta true y respeta default", () => {
    assert.equal(parseBooleanQuery("true"), true)
    assert.equal(parseBooleanQuery(undefined, true), true)
    assert.equal(parseBooleanQuery("false"), false)
})

test("buildSearchRegex genera regex case insensitive", () => {
    const regex = buildSearchRegex("Embargo")

    assert.equal(regex.test("marca de embargo"), true)
    assert.equal(regex.test("liquidacion"), false)
})

test("ensureOperativeSector rechaza sectores invalidos", () => {
    assert.equal(ensureOperativeSector(" Cordoba "), "cordoba")
    assert.throws(() => ensureOperativeSector("general"), /sector invalido/i)
})
