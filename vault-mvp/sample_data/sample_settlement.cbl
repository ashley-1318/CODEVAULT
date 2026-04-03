       IDENTIFICATION DIVISION.
       PROGRAM-ID. SETTLE-SYS.
* Called by LOAN-CALC via CALL 'SETTLE-SYS'
* Tests: DEPENDS_ON relationship in Neo4j
*        Cross-program compliance map linking

       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 SETTLEMENT-AMOUNT     PIC 9(12)V99 COMP-3.
       01 SWIFT-CODE            PIC X(11).
       01 SETTLEMENT-STATUS     PIC X(10).
       01 CURRENT-TIME          PIC 9(6).
       01 CLS-CUTOFF-TIME       PIC 9(6) VALUE 170000.
*                        ^^^ 17:00:00 — regulatory settlement cutoff
       01 GROSS-AMOUNT          PIC 9(12)V99 COMP-3 VALUE 1000.00.
       01 SETTLEMENT-FEE        PIC 9(05)V99 COMP-3 VALUE 25.50.

       PROCEDURE DIVISION.
       0000-MAIN.
           ACCEPT CURRENT-TIME FROM TIME.
           PERFORM 1000-VALIDATE-SWIFT
           PERFORM 2000-CHECK-CUTOFF
           PERFORM 3000-EXECUTE-SETTLEMENT
           PERFORM 4000-CONFIRM-RECEIPT
           STOP RUN.

       1000-VALIDATE-SWIFT.
* PCI-DSS compliance — validate SWIFT code format
           IF SWIFT-CODE = SPACES
               MOVE 'REJECTED' TO SETTLEMENT-STATUS
           END-IF.

       2000-CHECK-CUTOFF.
* MAS regulatory settlement cutoff — 17:00 SGT
           IF CURRENT-TIME > CLS-CUTOFF-TIME
               MOVE 'NEXT-DAY' TO SETTLEMENT-STATUS
           END-IF.

       3000-EXECUTE-SETTLEMENT.
           COMPUTE SETTLEMENT-AMOUNT = 
               GROSS-AMOUNT - SETTLEMENT-FEE.

       4000-CONFIRM-RECEIPT.
           MOVE 'CONFIRMED' TO SETTLEMENT-STATUS.
