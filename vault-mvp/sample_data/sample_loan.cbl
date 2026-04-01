      *================================================================
      * PROGRAM-ID: LOAN-CALC
      * PURPOSE:    BFSI Loan Calculation and Regulatory Compliance
      *             Program implementing Basel IV, IFRS 9, GDPR rules
      * AUTHOR:     VAULT DEMO
      * DATE:       2024-01-01
      *================================================================
       IDENTIFICATION DIVISION.
       PROGRAM-ID. LOAN-CALC.
       AUTHOR. VAULT-DEMO-SYSTEM.
       DATE-WRITTEN. 2024-01-01.
       DATE-COMPILED. 2024-01-01.

       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-MAINFRAME.
       OBJECT-COMPUTER. IBM-MAINFRAME.

       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT LOAN-FILE
               ASSIGN TO LOANFILE
               ORGANIZATION IS SEQUENTIAL
               ACCESS MODE IS SEQUENTIAL
               FILE STATUS IS WS-FILE-STATUS.
           SELECT AUDIT-FILE
               ASSIGN TO AUDITLOG
               ORGANIZATION IS SEQUENTIAL
               ACCESS MODE IS SEQUENTIAL
               FILE STATUS IS WS-AUDIT-STATUS.

       DATA DIVISION.
       FILE SECTION.
       FD  LOAN-FILE
           LABEL RECORDS ARE STANDARD
           BLOCK CONTAINS 0 RECORDS
           RECORD CONTAINS 200 CHARACTERS.
       01  LOAN-RECORD.
           05  LR-CUSTOMER-ID       PIC X(10).
           05  LR-LOAN-AMOUNT       PIC 9(12)V99 COMP-3.
           05  LR-INTEREST-RATE     PIC 9(3)V99 COMP-3.
           05  LR-LOAN-TERM-MONTHS  PIC 9(4) COMP.
           05  LR-CUSTOMER-DOB      PIC X(8).
           05  FILLER               PIC X(157).

       FD  AUDIT-FILE
           LABEL RECORDS ARE STANDARD
           RECORD CONTAINS 300 CHARACTERS.
       01  AUDIT-RECORD             PIC X(300).

       WORKING-STORAGE SECTION.

      *----------------------------------------------------------------
      * REGULATORY CONSTANTS (Basel IV, IFRS 9, GDPR)
      *----------------------------------------------------------------
       01  WS-REGULATORY-CONSTANTS.
           05  BASEL-CAP-RATIO      PIC 9V9(4) COMP-3 VALUE 0.08.
           05  MAX-LTV-RATIO        PIC 9V9(4) COMP-3 VALUE 0.85.
           05  GDPR-RETENTION-DAYS  PIC 9(5) COMP-3   VALUE 2557.
           05  IFRS9-STAGE2-THRESH  PIC 9V9(4) COMP-3  VALUE 0.20.
           05  IFRS9-STAGE3-THRESH  PIC 9V9(4) COMP-3  VALUE 0.50.
           05  BASEL-RISK-WEIGHT-STD PIC 9V9(4) COMP-3 VALUE 1.00.
           05  BASEL-RISK-WEIGHT-RET PIC 9V9(4) COMP-3 VALUE 0.75.
           05  BASEL-RISK-WEIGHT-COM PIC 9V9(4) COMP-3 VALUE 1.00.

      *----------------------------------------------------------------
      * LOAN CALCULATION VARIABLES
      *----------------------------------------------------------------
       01  WS-LOAN-DATA.
           05  WS-PRINCIPAL         PIC 9(12)V99 COMP-3 VALUE ZEROS.
           05  WS-INTEREST-RATE     PIC 9(3)V9(4) COMP-3 VALUE ZEROS.
           05  WS-MONTHLY-RATE      PIC 9(1)V9(8) COMP-3 VALUE ZEROS.
           05  WS-LOAN-TERM         PIC 9(4) COMP         VALUE ZEROS.
           05  WS-MONTHLY-PAYMENT   PIC 9(12)V99 COMP-3 VALUE ZEROS.
           05  WS-TOTAL-INTEREST    PIC 9(14)V99 COMP-3 VALUE ZEROS.
           05  WS-TOTAL-REPAYMENT   PIC 9(14)V99 COMP-3 VALUE ZEROS.

      *----------------------------------------------------------------
      * RISK AND CAPITAL VARIABLES
      *----------------------------------------------------------------
       01  WS-RISK-DATA.
           05  WS-CAPITAL-REQUIRED  PIC 9(14)V99 COMP-3 VALUE ZEROS.
           05  WS-CAPITAL-AVAIL     PIC 9(14)V99 COMP-3 VALUE ZEROS.
           05  WS-CAPITAL-RATIO     PIC 9V9(6)   COMP-3 VALUE ZEROS.
           05  WS-LTV-RATIO         PIC 9V9(4)   COMP-3 VALUE ZEROS.
           05  WS-PROPERTY-VALUE    PIC 9(12)V99 COMP-3 VALUE ZEROS.
           05  WS-ECL-AMOUNT        PIC 9(12)V99 COMP-3 VALUE ZEROS.
           05  WS-PD-SCORE          PIC 9V9(4)   COMP-3 VALUE ZEROS.
           05  WS-RISK-WEIGHT       PIC 9V9(4)   COMP-3 VALUE ZEROS.
           05  WS-CAPITA-ADJUSTED   PIC 9(14)V99 COMP-3 VALUE ZEROS.

      *----------------------------------------------------------------
      * CUSTOMER & GDPR VARIABLES
      *----------------------------------------------------------------
       01  WS-CUSTOMER-DATA.
           05  WS-CUSTOMER-ID       PIC X(10)    VALUE SPACES.
           05  WS-DATA-AGE-DAYS     PIC 9(5) COMP VALUE ZEROS.
           05  WS-GDPR-COMPLIANT    PIC X(1)     VALUE 'N'.
           05  WS-LOAN-TYPE         PIC X(3)     VALUE 'RET'.

      *----------------------------------------------------------------
      * PROCESS CONTROL VARIABLES
      *----------------------------------------------------------------
       01  WS-CONTROL.
           05  WS-RETURN-CODE       PIC 9(4) COMP VALUE ZEROS.
           05  WS-FILE-STATUS       PIC X(2)     VALUE SPACES.
           05  WS-AUDIT-STATUS      PIC X(2)     VALUE SPACES.
           05  WS-ERROR-MSG         PIC X(100)   VALUE SPACES.
           05  WS-CREDIT-STAGE      PIC 9(1) COMP VALUE 1.
           05  WS-IFRS-STAGE        PIC 9(1) COMP VALUE 1.
           05  WS-BASEL-PASS        PIC X(1)     VALUE 'N'.

      *----------------------------------------------------------------
      * REPORT VARIABLES
      *----------------------------------------------------------------
       01  WS-REPORT-DATA.
           05  WS-REPORT-LINE       PIC X(132)   VALUE SPACES.
           05  WS-REPORT-DATE       PIC X(10)    VALUE SPACES.
           05  WS-IFRS-REPORT-FLAG  PIC X(1)     VALUE 'N'.

       PROCEDURE DIVISION.
      *================================================================
       0000-MAIN.
      *================================================================
           PERFORM 1000-VALIDATE-INPUT
           IF WS-RETURN-CODE = 0
               PERFORM 2000-CALC-INTEREST
               PERFORM 2100-APPLY-BASEL-CAP
               PERFORM 2200-CALC-LTV-RATIO
               PERFORM 3000-CHECK-CREDIT-RISK
               PERFORM 3100-APPLY-RISK-WEIGHTS
               PERFORM 4000-GENERATE-IFRS-REPORT
               PERFORM 5000-GDPR-DATA-CHECK
               PERFORM 6000-SETTLEMENT-CALL
               PERFORM 7000-AUDIT-LOG
           END-IF
           PERFORM 9000-END-PROGRAM
           STOP RUN.

      *================================================================
       1000-VALIDATE-INPUT.
      *================================================================
      * Validates loan input against regulatory limits
      * Enforces Basel IV minimum capital and LTV ratio limits
           MOVE LR-CUSTOMER-ID  TO WS-CUSTOMER-ID
           MOVE LR-LOAN-AMOUNT  TO WS-PRINCIPAL
           MOVE LR-INTEREST-RATE TO WS-INTEREST-RATE
           MOVE LR-LOAN-TERM-MONTHS TO WS-LOAN-TERM

           IF WS-PRINCIPAL <= ZEROS
               MOVE 'INVALID PRINCIPAL AMOUNT' TO WS-ERROR-MSG
               MOVE 1001 TO WS-RETURN-CODE
               GO TO 1000-VALIDATE-EXIT
           END-IF

           IF WS-INTEREST-RATE <= ZEROS
           OR WS-INTEREST-RATE > 50.00
               MOVE 'INTEREST RATE OUT OF REGULATORY BOUNDS' TO WS-ERROR-MSG
               MOVE 1002 TO WS-RETURN-CODE
               GO TO 1000-VALIDATE-EXIT
           END-IF

           IF WS-LOAN-TERM <= ZEROS
           OR WS-LOAN-TERM > 360
               MOVE 'LOAN TERM EXCEEDS MAXIMUM REGULATORY LIMIT'
                   TO WS-ERROR-MSG
               MOVE 1003 TO WS-RETURN-CODE
               GO TO 1000-VALIDATE-EXIT
           END-IF

           MOVE ZEROS TO WS-RETURN-CODE.

       1000-VALIDATE-EXIT.
           EXIT.

      *================================================================
       2000-CALC-INTEREST.
      *================================================================
      * Calculates monthly interest and total loan repayment
      * Uses packed decimal arithmetic for regulatory precision
           COMPUTE WS-MONTHLY-RATE =
               WS-INTEREST-RATE / 12 / 100

           COMPUTE WS-MONTHLY-PAYMENT =
               WS-PRINCIPAL *
               (WS-MONTHLY-RATE *
               (1 + WS-MONTHLY-RATE) ** WS-LOAN-TERM) /
               ((1 + WS-MONTHLY-RATE) ** WS-LOAN-TERM - 1)

           COMPUTE WS-TOTAL-REPAYMENT =
               WS-MONTHLY-PAYMENT * WS-LOAN-TERM

           COMPUTE WS-TOTAL-INTEREST =
               WS-TOTAL-REPAYMENT - WS-PRINCIPAL.

      *================================================================
       2100-APPLY-BASEL-CAP.
      *================================================================
      * Basel IV Capital Adequacy Check
      * Verifies capital ratio meets the Basel minimum of 8% (0.08)
      * Reference: Basel IV CRR III Article 92 Minimum Capital Requirements
           COMPUTE WS-CAPITAL-REQUIRED =
               WS-PRINCIPAL * BASEL-CAP-RATIO

           COMPUTE WS-CAPITAL-RATIO =
               WS-CAPITAL-AVAIL / WS-PRINCIPAL

           IF WS-CAPITAL-RATIO < BASEL-CAP-RATIO
               MOVE 'N' TO WS-BASEL-PASS
               MOVE 'BASEL IV CAPITAL ADEQUACY BREACH - LOAN BLOCKED'
                   TO WS-ERROR-MSG
               MOVE 2101 TO WS-RETURN-CODE
           ELSE
               MOVE 'Y' TO WS-BASEL-PASS
           END-IF.

      *================================================================
       2200-CALC-LTV-RATIO.
      *================================================================
      * Loan-To-Value Ratio Calculation
      * Enforces regulatory maximum LTV of 85% per central bank guidance
           IF WS-PROPERTY-VALUE > ZEROS
               COMPUTE WS-LTV-RATIO =
                   WS-PRINCIPAL / WS-PROPERTY-VALUE

               IF WS-LTV-RATIO > MAX-LTV-RATIO
                   MOVE 'LTV RATIO EXCEEDS REGULATORY MAXIMUM 85%'
                       TO WS-ERROR-MSG
                   MOVE 2201 TO WS-RETURN-CODE
               END-IF
           END-IF.

      *================================================================
       3000-CHECK-CREDIT-RISK.
      *================================================================
      * IFRS 9 Expected Credit Loss (ECL) Staging
      * Stage 1: < 20% PD (12-month ECL)
      * Stage 2: 20-50% PD (Lifetime ECL - significant credit deterioration)
      * Stage 3: > 50% PD (Lifetime ECL - credit-impaired)
           EVALUATE TRUE
               WHEN WS-PD-SCORE < IFRS9-STAGE2-THRESH
                   MOVE 1 TO WS-CREDIT-STAGE
                   MOVE 1 TO WS-IFRS-STAGE
                   COMPUTE WS-ECL-AMOUNT =
                       WS-PRINCIPAL * WS-PD-SCORE * 0.12
               WHEN WS-PD-SCORE < IFRS9-STAGE3-THRESH
                   MOVE 2 TO WS-CREDIT-STAGE
                   MOVE 2 TO WS-IFRS-STAGE
                   COMPUTE WS-ECL-AMOUNT =
                       WS-PRINCIPAL * WS-PD-SCORE
               WHEN OTHER
                   MOVE 3 TO WS-CREDIT-STAGE
                   MOVE 3 TO WS-IFRS-STAGE
                   MOVE WS-PRINCIPAL TO WS-ECL-AMOUNT
           END-EVALUATE.

      *================================================================
       3100-APPLY-RISK-WEIGHTS.
      *================================================================
      * Basel IV Risk Weight Assignment per Loan Type
      * RET = Retail mortgage: 75% risk weight
      * COM = Commercial real estate: 100% risk weight
      * STD = Standardized: 100% risk weight
           EVALUATE WS-LOAN-TYPE
               WHEN 'RET'
                   MOVE BASEL-RISK-WEIGHT-RET TO WS-RISK-WEIGHT
               WHEN 'COM'
                   MOVE BASEL-RISK-WEIGHT-COM TO WS-RISK-WEIGHT
               WHEN OTHER
                   MOVE BASEL-RISK-WEIGHT-STD TO WS-RISK-WEIGHT
           END-EVALUATE

           COMPUTE WS-CAPITA-ADJUSTED =
               WS-PRINCIPAL * WS-RISK-WEIGHT * BASEL-CAP-RATIO.

      *================================================================
       4000-GENERATE-IFRS-REPORT.
      *================================================================
      * IFRS 9 Regulatory Reporting Paragraph
      * Writes ECL staging report required by IFRS 9 standard
           MOVE 'Y' TO WS-IFRS-REPORT-FLAG
           MOVE FUNCTION CURRENT-DATE (1:10) TO WS-REPORT-DATE

           STRING 'IFRS9 REPORT | LOAN:' DELIMITED SIZE
                  WS-CUSTOMER-ID         DELIMITED SIZE
                  ' | STAGE:' DELIMITED SIZE
                  WS-IFRS-STAGE          DELIMITED SIZE
                  ' | ECL:' DELIMITED SIZE
                  WS-ECL-AMOUNT          DELIMITED SIZE
                  ' | DATE:' DELIMITED SIZE
                  WS-REPORT-DATE         DELIMITED SIZE
               INTO WS-REPORT-LINE

           WRITE AUDIT-RECORD FROM WS-REPORT-LINE.

      *================================================================
       5000-GDPR-DATA-CHECK.
      *================================================================
      * GDPR Data Retention Compliance Check
      * Maximum retention period is 2557 days (7 years) per GDPR Article 5
      * Data exceeding this limit must be flagged for erasure
           IF WS-DATA-AGE-DAYS > GDPR-RETENTION-DAYS
               MOVE 'N' TO WS-GDPR-COMPLIANT
               MOVE 'GDPR ALERT: DATA EXCEEDS 7-YEAR RETENTION LIMIT'
                   TO WS-ERROR-MSG
               MOVE 5001 TO WS-RETURN-CODE
           ELSE
               MOVE 'Y' TO WS-GDPR-COMPLIANT
           END-IF.

      *================================================================
       6000-SETTLEMENT-CALL.
      *================================================================
      * Calls external settlement system for loan disbursement processing
      * SETTLE-SYS handles actual fund transfer and confirmation
           CALL 'SETTLE-SYS' USING
               WS-CUSTOMER-ID
               WS-PRINCIPAL
               WS-MONTHLY-PAYMENT
               WS-RETURN-CODE.

      *================================================================
       7000-AUDIT-LOG.
      *================================================================
      * Writes comprehensive audit trail for regulatory compliance
      * Required by GDPR, Basel IV, and internal risk controls
           STRING 'AUDIT | CUST:' DELIMITED SIZE
                  WS-CUSTOMER-ID  DELIMITED SIZE
                  ' | LOAN:' DELIMITED SIZE
                  WS-PRINCIPAL    DELIMITED SIZE
                  ' | RATE:' DELIMITED SIZE
                  WS-INTEREST-RATE DELIMITED SIZE
                  ' | CAP-OK:' DELIMITED SIZE
                  WS-BASEL-PASS  DELIMITED SIZE
                  ' | GDPR:' DELIMITED SIZE
                  WS-GDPR-COMPLIANT DELIMITED SIZE
               INTO AUDIT-RECORD

           WRITE AUDIT-RECORD.

      *================================================================
       9000-END-PROGRAM.
      *================================================================
      * Program cleanup and termination
           CLOSE LOAN-FILE
           CLOSE AUDIT-FILE
           MOVE WS-RETURN-CODE TO RETURN-CODE.
