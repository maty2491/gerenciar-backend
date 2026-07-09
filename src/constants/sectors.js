export const OPERATIVE_SECTORS = [
    "buenos aires",
    "santa fe",
    "cordoba",
    "entre rios",
    "corrientes",
    "recepcion",
    "administracion",
    "rrhh",
    "inicio"

]

export const PENDING_SECTOR = "general"

export const ALL_USER_SECTORS = [...OPERATIVE_SECTORS, PENDING_SECTOR]

export const isOperativeSector = (sector = "") => OPERATIVE_SECTORS.includes(sector?.toLowerCase())
