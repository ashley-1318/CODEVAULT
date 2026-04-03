import re
from typing import Any, Set


class COBOLParser:
    """
    Parses raw COBOL source text and extracts structured information.
    Handles both fixed-format (columns 7-72) and free-format COBOL.
    Uses only Python standard library plus re.
    """

    CLASSIFICATION_COLS = (6, 72)  # 0-indexed: column 7 to 72

    def __init__(self, raw_cobol: str):
        self.raw_cobol = raw_cobol
        self.lines = raw_cobol.splitlines()
        self.is_fixed_format = self._detect_format()

    def _detect_format(self) -> bool:
        """Detect if COBOL is fixed-format (columns 7-72) or free-format."""
        indicator_count = 0
        sample_lines = [l for l in self.lines if l.strip() and not l.strip().startswith("*")][:20]
        for line in sample_lines:
            if len(line) >= 7:
                indicator_col = line[6] if len(line) > 6 else " "
                if indicator_col in (" ", "-", "*", "/", "D", "d"):
                    indicator_count += 1
        return indicator_count >= (len(sample_lines) * 0.5)

    def _get_code_text(self, line: str) -> str:
        """Extract the code portion of a line based on format."""
        if self.is_fixed_format:
            if len(line) < 7:
                return ""
            indicator = line[6] if len(line) > 6 else " "
            if indicator in ("*", "/"):
                return ""
            code = line[6:72] if len(line) >= 72 else line[6:]
            return code.strip()
        else:
            stripped = line.strip()
            if stripped.startswith("*"):
                return ""
            return stripped

    def _get_clean_lines(self) -> list[str]:
        """Return all non-comment, non-empty code lines."""
        result = []
        for line in self.lines:
            code = self._get_code_text(line)
            if code:
                result.append(code)
        return result

    def _normalize_source(self) -> str:
        """Join all clean code lines into a single normalized string."""
        return "\n".join(self._get_clean_lines())

    def extract_program_name(self, source: str) -> str:
        """Extract program name from PROGRAM-ID clause."""
        pattern = re.compile(
            r"PROGRAM-ID\s*[.\s]+([A-Z0-9][A-Z0-9\-]*)",
            re.IGNORECASE | re.MULTILINE,
        )
        match = pattern.search(source)
        if match:
            name = match.group(1).strip().rstrip(".")
            return name.upper()
        return "UNKNOWN"

    def extract_working_storage_variables(self, source: str) -> list[dict[str, Any]]:
        """
        Extract all variables from WORKING-STORAGE SECTION.
        Captures level number, name, PIC clause, and VALUE if present.
        """
        variables = []
        # Find WORKING-STORAGE SECTION block
        ws_pattern = re.compile(
            r"WORKING-STORAGE\s+SECTION\s*\.(.*?)(?=(?:LINKAGE\s+SECTION|FILE\s+SECTION|LOCAL-STORAGE\s+SECTION|PROCEDURE\s+DIVISION)|$)",
            re.IGNORECASE | re.DOTALL,
        )
        ws_match = ws_pattern.search(source)
        if not ws_match:
            return variables

        ws_text = ws_match.group(1)

        # Match variable declarations: level name PIC ... VALUE ...
        var_pattern = re.compile(
            r"(\d{2})\s+([A-Z0-9][A-Z0-9\-]*)\s+"
            r"(?:PIC\s+(?:IS\s+)?([A-Z9\(\)V\.+\-SX]+)"
            r"(?:\s+COMP(?:-[0-9])?)?"
            r"(?:\s+VALUE\s+(?:IS\s+)?([^\n.]+))?)?",
            re.IGNORECASE,
        )
        for match in var_pattern.finditer(ws_text):
            level = match.group(1).strip()
            name = match.group(2).strip().upper()
            pic = match.group(3).strip().upper() if match.group(3) else None
            value = match.group(4).strip() if match.group(4) else None

            # Clean up value
            if value:
                value = value.strip().rstrip(".")
                value = re.sub(r"\s{2,}", " ", value)

            # Skip FD, 66, 77-level redefinitions that aren't real WS vars
            if name in ("FILLER", "REDEFINES") or not pic and level not in ("01", "77"):
                if level not in ("01", "77") and not pic:
                    continue

            variables.append(
                {
                    "level": level,
                    "name": name,
                    "pic": pic,
                    "value": value,
                }
            )

        return variables

    def extract_paragraphs(self, source: str) -> list[dict[str, Any]]:
        """
        Extract all paragraph names and their complete text from PROCEDURE DIVISION.
        """
        paragraphs = []

        # Find PROCEDURE DIVISION block
        proc_pattern = re.compile(
            r"PROCEDURE\s+DIVISION(?:\s+USING\s+[^\n.]+)?\s*\.(.*?)(?=END\s+PROGRAM|$)",
            re.IGNORECASE | re.DOTALL,
        )
        proc_match = proc_pattern.search(source)
        if not proc_match:
            return paragraphs

        proc_text = proc_match.group(1)

        # Split paragraph blocks — paragraph names are identifiers at start of line
        # followed by a period on same or next line
        para_header_pattern = re.compile(
            r"^([A-Z0-9][A-Z0-9\-]*)\s*\.",
            re.IGNORECASE | re.MULTILINE,
        )

        # Find all paragraph headers and their positions
        headers = list(para_header_pattern.finditer(proc_text))

        for i, header in enumerate(headers):
            para_name = header.group(1).strip().upper()
            # Skip SECTION headers
            if para_name.upper().endswith("SECTION"):
                continue

            start_pos = header.end()
            end_pos = headers[i + 1].start() if i + 1 < len(headers) else len(proc_text)
            para_body = proc_text[start_pos:end_pos].strip()

            paragraphs.append(
                {
                    "name": para_name,
                    "text": para_body,
                    "line_count": len(para_body.splitlines()),
                }
            )

        return paragraphs

    def _extract_copy_statements(self, source: str) -> Set[str]:
        """Extract all COPY member names from the source."""
        # Matches COPY MEMBERNAME or COPY "MEMBERNAME" or COPY MEMBERNAME OF LIBRARY
        copy_pattern = re.compile(
            r"COPY\s+['\"]?([A-Z0-9\-]+)['\"]?(?:\s+OF\s+[A-Z0-9\-]+)?",
            re.IGNORECASE,
        )
        found = set()
        for match in copy_pattern.finditer(source):
            found.add(match.group(1).upper())
        return found


    def extract_call_statements(self, source: str) -> list[dict[str, Any]]:
        """Extract all CALL statements with their target program names."""
        calls = []
        call_pattern = re.compile(
            r"CALL\s+['\"]([A-Z0-9\-]+)['\"]\s*(?:USING\s+([^\n.]+))?",
            re.IGNORECASE,
        )
        for match in call_pattern.finditer(source):
            target = match.group(1).strip().upper()
            using_clause = match.group(2).strip() if match.group(2) else None

            # Find which paragraph this call is in
            paragraph = "UNKNOWN"
            paragraphs = self.extract_paragraphs(source)
            for para in paragraphs:
                if target in para["text"].upper():
                    paragraph = para["name"]
                    break

            calls.append(
                {
                    "target_program": target,
                    "using_clause": using_clause,
                    "in_paragraph": paragraph,
                    "type": "CALL"
                }
            )
        return calls


    def extract_hardcoded_literals(self, source: str, threshold: int = 100) -> list[dict[str, Any]]:
        """
        Extract hardcoded numeric literals above threshold (potential regulatory constants).
        """
        literals = []
        # Match numeric literals in VALUE clauses and comparisons
        literal_pattern = re.compile(
            r"(?:VALUE\s+(?:IS\s+)?|=\s*|>\s*|<\s*|>=\s*|<=\s*)([0-9]+(?:\.[0-9]+)?)",
            re.IGNORECASE,
        )

        for i, line in enumerate(self.lines, 1):
            code = self._get_code_text(line)
            if not code:
                continue

            for match in literal_pattern.finditer(code):
                raw_val = match.group(1).strip()
                try:
                    numeric_val = float(raw_val)
                    if numeric_val > threshold:
                        # Try to find the variable name on the same line
                        var_name_match = re.search(
                            r"([A-Z][A-Z0-9\-]+)\s+(?:PIC\s+[^\s]+\s+)?VALUE",
                            code,
                            re.IGNORECASE,
                        )
                        context_var = var_name_match.group(1).upper() if var_name_match else "INLINE"
                        literals.append(
                            {
                                "value": numeric_val,
                                "raw": raw_val,
                                "line_number": i,
                                "line_text": code,
                                "associated_var": context_var,
                                "flag": "POTENTIAL_REGULATORY_CONSTANT",
                            }
                        )
                except ValueError:
                    continue
        return literals

    def parse(self) -> dict[str, Any]:
        """
        Main parse method. Returns a fully structured dict with all extracted info.
        """
        source = self._normalize_source()

        program_name = self.extract_program_name(source)
        variables = self.extract_working_storage_variables(source)
        paragraphs = self.extract_paragraphs(source)
        call_statements = self.extract_call_statements(source)
        copy_members = self._extract_copy_statements(source)
        hardcoded_literals = self.extract_hardcoded_literals(source)

        return {
            "program_name": program_name,
            "format": "fixed" if self.is_fixed_format else "free",
            "line_count": len(self.lines),
            "variables": variables,
            "variable_count": len(variables),
            "paragraphs": paragraphs,
            "paragraph_count": len(paragraphs),
            "call_statements": call_statements,
            "copy_members": list(copy_members),
            "call_count": len(call_statements) + len(copy_members),
            "hardcoded_literals": hardcoded_literals,
            "hardcoded_literal_count": len(hardcoded_literals),
        }

