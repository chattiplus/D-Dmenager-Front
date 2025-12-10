
import {httpClient, withoutAuth} from './httpClient'
import type {DiceRollResponse} from '../types/api'

export async function rollD20(): Promise<DiceRollResponse> {
    const response = await httpClient.get<DiceRollResponse>('/dice/d20', withoutAuth())
    return response.data
}

// opzionale: generico, se poi vorrai d6/d8/...
export async function rollDice(sides: number): Promise<DiceRollResponse> {
    const response = await httpClient.get<DiceRollResponse>(`/dice/d${sides}`, withoutAuth())
    return response.data
}
