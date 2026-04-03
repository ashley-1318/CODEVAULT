       01  ACCOUNT-RECORD.
           05  ACC-NUMBER          PIC X(10).
           05  ACC-HOLDER-NAME     PIC X(35).
           05  ACC-BALANCE         PIC 9(12)V99.
           05  ACC-STATUS          PIC X(01).
               88  ACC-ACTIVE      VALUE 'A'.
               88  ACC-FROZEN      VALUE 'F'.
               88  ACC-CLOSED      VALUE 'C'.
           05  ACC-COUNTRY         PIC X(02).
           05  ACC-CURRENCY        PIC X(03).
