const Characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_"
const AllCharacters = `0123456789${Characters}`

export function RandomInteger(Min: number, Max: number) {
    return Math.floor(Math.random() * (Max - Min + 1)) + Min
}

export function RandomVariableName() {
    const Length = RandomInteger(32, 64)

    const VariableName = Buffer.allocUnsafe(Length)
    VariableName[0] = Characters.charCodeAt(RandomInteger(0, Characters.length - 1))

    for (let Index = 1; Index < Length; Index++) {
        VariableName[Index] = AllCharacters.charCodeAt(RandomInteger(0, AllCharacters.length - 1))
    }

    return VariableName.toString("utf-8")
}
