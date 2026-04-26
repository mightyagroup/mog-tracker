// Stub to bisect Vercel build failure.
export type SimpleTokenValue = string | number | null | undefined
export type TableTokenValue = { headers: string[]; rows: Array<Array<string | number | null | undefined>> }
export type ListTokenValue = { bullets: string[] }
export type TokenValue = SimpleTokenValue | TableTokenValue | ListTokenValue
export type TokenMap = Record<string, TokenValue>

export async function generateBidDoc(_template: Buffer, _tokens: TokenMap): Promise<Buffer> {
  throw new Error('not yet implemented')
}
