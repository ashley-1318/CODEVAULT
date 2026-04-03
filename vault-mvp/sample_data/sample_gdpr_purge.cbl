       IDENTIFICATION DIVISION.
       PROGRAM-ID. GDPR-PURGE.
* Tests: GDPR regulation detection
*        Hardcoded retention constant flagging
*        Dead code identification

       ENVIRONMENT DIVISION.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 RETENTION-PERIOD      PIC 9(4) VALUE 2557.
*                        ^^^ 7 years in days — GDPR Article 5
       01 DATA-AGE-DAYS         PIC 9(5) VALUE 3000.
       01 CUSTOMER-DOB          PIC 9(8).
       01 PURGE-STATUS          PIC X(10).
       01 LEGACY-AUDIT-FLAG     PIC X VALUE 'N'.
* ^^^ never used — dead code candidate

       PROCEDURE DIVISION.
       0000-MAIN.
           PERFORM 1000-CHECK-RETENTION
           PERFORM 2000-ANONYMIZE-PII
           PERFORM 3000-PURGE-RECORDS
           STOP RUN.

       1000-CHECK-RETENTION.
* GDPR Article 5(1)(e) — storage limitation
           IF DATA-AGE-DAYS > RETENTION-PERIOD
               PERFORM 2000-ANONYMIZE-PII
           END-IF.

       2000-ANONYMIZE-PII.
* GDPR Article 25 — data minimisation
           MOVE ZEROS TO CUSTOMER-DOB
           MOVE 'ANONYMIZED' TO PURGE-STATUS.

       3000-PURGE-RECORDS.
           MOVE 'PURGED' TO PURGE-STATUS.

       9999-OLD-AUDIT-TRAIL.
* Replaced by enterprise audit system in 2019
* Never called — dead code
           MOVE 'Y' TO LEGACY-AUDIT-FLAG.
