import { describe, expect, it } from 'vitest'
import { toCsv } from './download'

describe('toCsv', () => {
  it('joins rows and quotes cells that need it', () => {
    expect(toCsv([['Athlete', 'Notes'], ['Alex Johnson', 'Sat out, rested']])).toBe(
      'Athlete,Notes\r\nAlex Johnson,"Sat out, rested"',
    )
    expect(toCsv([['Said "fine"']])).toBe('"Said ""fine"""')
  })

  it('keeps numbers but neutralises formulas', () => {
    expect(toCsv([['+18%', '-6%', '=HYPERLINK("x")', '@cmd']])).toBe(`+18%,-6%,"'=HYPERLINK(""x"")",'@cmd`)
  })
})
