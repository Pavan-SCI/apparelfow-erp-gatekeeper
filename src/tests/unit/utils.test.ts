import { describe, it, expect } from 'vitest'
import { calculateWastagePercentage, getTrafficLightStatus } from '@/lib/utils'

describe('Domain Utils (Unit Tests)', () => {
  describe('calculateWastagePercentage', () => {
    it('should return 0 when expected and actual yards are the same', () => {
      expect(calculateWastagePercentage(100, 100)).toBe(0)
    })

    it('should correctly calculate positive wastage percentage', () => {
      // (110 - 100) / 100 * 100 = 10%
      expect(calculateWastagePercentage(100, 110)).toBe(10)
    })

    it('should round to 2 decimal places', () => {
      // (103.333 - 100) / 100 * 100 = 3.333% -> 3.33%
      expect(calculateWastagePercentage(100, 103.333)).toBe(3.33)
    })

    it('should return 0 if actual is less than expected (no wastage)', () => {
      expect(calculateWastagePercentage(100, 90)).toBe(0)
    })
    
    it('should handle zero expected yards gracefully', () => {
      expect(calculateWastagePercentage(0, 50)).toBe(0)
    })
  })

  describe('getTrafficLightStatus', () => {
    it('should return GREEN when quantities match exactly', () => {
      expect(getTrafficLightStatus(50, 50)).toBe('GREEN')
    })

    it('should return RED when actual quantity is less than expected (shortage)', () => {
      expect(getTrafficLightStatus(50, 48)).toBe('RED')
    })

    it('should return YELLOW when actual quantity is more than expected (excess)', () => {
      expect(getTrafficLightStatus(50, 52)).toBe('YELLOW')
    })
  })
})
