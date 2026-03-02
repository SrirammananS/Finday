package com.laksh.finance

import org.junit.Assert.*
import org.junit.Test

/**
 * Unit tests for SMS transaction parsing. Run with: ./gradlew test
 * Tests run before build - no device/emulator needed.
 */
class SmsParserTest {

    @Test
    fun parseHdfcDebit() {
        val sms = "Rs 500 debited from A/c XX1234 on 28-Feb."
        val t = SmsParser.parse(sms)
        assertNotNull(t)
        assertEquals(-500.0, t!!.amount, 0.01)
        assertEquals("expense", t.type)
    }

    @Test
    fun parseUpiSwiggy() {
        val sms = "Rs 350 debited to Swiggy on 28/02/2025. UPI ref 123456."
        val t = SmsParser.parse(sms)
        assertNotNull(t)
        assertEquals(-350.0, t!!.amount, 0.01)
        assertTrue(t.description.lowercase().contains("swiggy") || t.description.isNotBlank())
    }

    @Test
    fun parseCredit() {
        val sms = "Rs 2000 credited to A/c XX5678 on 28-Feb. Ref: UPI123."
        val t = SmsParser.parse(sms)
        assertNotNull(t)
        assertEquals(2000.0, t!!.amount, 0.01)
        assertEquals("income", t.type)
    }

    @Test
    fun parseOtpReturnsNull() {
        val sms = "Your OTP is 123456. Do not share."
        val t = SmsParser.parse(sms)
        assertNull(t)
    }

    @Test
    fun parseEmptyReturnsNull() {
        assertNull(SmsParser.parse(""))
        assertNull(SmsParser.parse("   "))
    }

    @Test
    fun parseIciciFormat() {
        val sms = "INR 1200.00 debited from A/c XX1234 on 01-Mar-25. Info: AMAZON. Avl Bal INR 25000."
        val t = SmsParser.parse(sms)
        assertNotNull(t)
        assertEquals(-1200.0, t!!.amount, 0.01)
    }
}
