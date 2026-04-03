# backend/parsers/compiler_artefact_parser.py

import re
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum

class NumprocMode(Enum):
    PFD = "PREFERRED_SIGN"      # IBM preferred sign for packed decimal
    NOPFD = "STANDARD_SIGN"     # Standard sign processing
    
class TruncMode(Enum):
    BIN = "BINARY_TRUNCATION"   # Truncate to binary field size
    STD = "STANDARD_TRUNCATION" # Truncate to PIC clause size
    OPT = "OPTIMIZED"           # Compiler-optimized truncation

class ArithMode(Enum):
    EXTEND = "EXTENDED_31_DIGIT"  # 31-digit extended arithmetic
    COMPAT = "COMPATIBLE_18_DIGIT" # 18-digit compatible arithmetic

@dataclass
class NumericDirective:
    """
    Represents the numeric handling behavior 
    of a specific COMP-3 field as determined
    by compiler options — NOT source code.
    """
    field_name: str
    pic_clause: str
    numproc_mode: NumprocMode
    trunc_mode: TruncMode
    arith_mode: ArithMode
    precision_digits: int
    scale_digits: int
    
    @property
    def rounding_behavior(self) -> str:
        """
        Derives the actual rounding behavior from
        the combination of compiler options.
        This is the behavioral specification that
        source code alone cannot provide.
        """
        if self.numproc_mode == NumprocMode.PFD:
            if self.trunc_mode == TruncMode.BIN:
                return "BINARY_TRUNCATION_WITH_PREFERRED_SIGN"
            return "HALF_UP_WITH_PREFERRED_SIGN"
        return "HALF_UP_STANDARD"
    
    @property
    def java_equivalent(self) -> str:
        """Maps to Java BigDecimal rounding mode."""
        mapping = {
            "BINARY_TRUNCATION_WITH_PREFERRED_SIGN": 
                "RoundingMode.DOWN",
            "HALF_UP_WITH_PREFERRED_SIGN": 
                "RoundingMode.HALF_UP",
            "HALF_UP_STANDARD": 
                "RoundingMode.HALF_UP"
        }
        return mapping.get(self.rounding_behavior, 
                          "RoundingMode.HALF_UP")
    
    @property  
    def python_equivalent(self) -> str:
        """Maps to Python Decimal rounding mode."""
        mapping = {
            "BINARY_TRUNCATION_WITH_PREFERRED_SIGN": 
                "ROUND_DOWN",
            "HALF_UP_WITH_PREFERRED_SIGN": 
                "ROUND_HALF_UP",
            "HALF_UP_STANDARD": 
                "ROUND_HALF_UP"
        }
        return mapping.get(self.rounding_behavior,
                          "ROUND_HALF_UP")

@dataclass
class CompilerArtefact:
    """
    The complete behavioral specification of a COBOL program
    as determined by its compiler options and execution environment.
    
    This is the input that VAULT uses — not raw source code.
    """
    program_name: str
    compiler_version: str
    compile_date: str
    
    # The three critical option groups
    numproc_mode: NumprocMode = NumprocMode.PFD
    trunc_mode: TruncMode = TruncMode.BIN
    arith_mode: ArithMode = ArithMode.EXTEND
    
    # Extracted field specifications
    numeric_directives: list[NumericDirective] = field(
        default_factory=list
    )
    
    # Cross-reference data
    field_references: dict[str, list[int]] = field(
        default_factory=dict
    )
    
    # Completeness flag
    artefact_source: str = "REAL_COMPILER_LISTING"
    completeness: str = "COMPLETE"
    
    def to_platform_aware_model(self) -> dict:
        """
        Converts the compiler artefact into the
        Platform-Aware Application Model that
        Chronicle agents consume.
        """
        return {
            "program_name": self.program_name,
            "compiler_version": self.compiler_version,
            "compile_date": self.compile_date,
            "numeric_handling": {
                "numproc_mode": self.numproc_mode.value,
                "trunc_mode": self.trunc_mode.value,
                "arith_mode": self.arith_mode.value,
            },
            "field_specifications": [
                {
                    "field_name": d.field_name,
                    "pic_clause": d.pic_clause,
                    "rounding_behavior": d.rounding_behavior,
                    "python_rounding": d.python_equivalent,
                    "java_rounding": d.java_equivalent,
                    "precision": d.precision_digits,
                    "scale": d.scale_digits
                }
                for d in self.numeric_directives
            ],
            "field_references": self.field_references,
            "artefact_source": self.artefact_source,
            "completeness": self.completeness
        }


class CompilerArtefactParser:
    """
    Parses IBM Enterprise COBOL compiler listing files (.lst)
    to extract the complete runtime behavioral specification
    of a COBOL program.
    
    This is the component that makes VAULT architecturally
    different from every other modernization tool.
    Every other tool starts with source code.
    VAULT starts here.
    """
    
    # Regex patterns for compiler listing file
    PROGRAM_ID_PATTERN = re.compile(
        r'PROGRAM-ID\.\s+(\w+)', re.IGNORECASE
    )
    COMPILER_VERSION_PATTERN = re.compile(
        r'IBM Enterprise COBOL for z/OS\s+([\d.]+)'
    )
    COMPILE_DATE_PATTERN = re.compile(
        r'Date\s+(\d{4}-\d{2}-\d{2})'
    )
    OPTIONS_PATTERN = re.compile(
        r'Options used:\s+(.+?)(?:\n|$)'
    )
    NUMPROC_PATTERN = re.compile(
        r'NUMPROC\((PFD|NOPFD)\)', re.IGNORECASE
    )
    TRUNC_PATTERN = re.compile(
        r'TRUNC\((BIN|STD|OPT)\)', re.IGNORECASE
    )
    ARITH_PATTERN = re.compile(
        r'ARITH\((EXTEND|COMPAT)\)', re.IGNORECASE
    )
    XREF_PATTERN = re.compile(
        r'(\w[\w-]*)\s+(\d+)\s+([\d\s]+?)(?=\n\s*\w|\Z)'
    )
    COMP3_PATTERN = re.compile(
        r'(\w[\w-]*)\s+PIC\s+[S]?9\((\d+)\)(?:V9\((\d+)\))?\s+'
        r'COMP(?:UTATIONAL)?-3',
        re.IGNORECASE
    )
    
    def parse_listing_file(
        self, 
        listing_content: str
    ) -> CompilerArtefact:
        """
        Main entry point. Parses a complete compiler 
        listing file and returns a CompilerArtefact.
        
        Args:
            listing_content: Raw text of the .lst file
            
        Returns:
            CompilerArtefact with full behavioral specification
        """
        # Extract program identity
        program_name = self._extract_program_name(listing_content)
        compiler_version = self._extract_compiler_version(
            listing_content
        )
        compile_date = self._extract_compile_date(listing_content)
        
        # Extract the critical compiler options
        options_line = self._extract_options_line(listing_content)
        numproc = self._parse_numproc(options_line)
        trunc = self._parse_trunc(options_line)
        arith = self._parse_arith(options_line)
        
        # Extract field cross-references
        field_refs = self._extract_cross_references(listing_content)
        
        # Extract COMP-3 field specifications
        # and combine with compiler options to derive
        # exact runtime numeric behavior
        numeric_directives = self._build_numeric_directives(
            listing_content, numproc, trunc, arith
        )
        
        return CompilerArtefact(
            program_name=program_name,
            compiler_version=compiler_version,
            compile_date=compile_date,
            numproc_mode=numproc,
            trunc_mode=trunc,
            arith_mode=arith,
            numeric_directives=numeric_directives,
            field_references=field_refs,
            artefact_source="REAL_COMPILER_LISTING",
            completeness="COMPLETE"
        )
    
    def parse_source_only(
        self, 
        cobol_source: str,
        program_name: str
    ) -> CompilerArtefact:
        """
        Fallback mode when no compiler listing is available.
        Simulates artefact from source code analysis.
        Explicitly flagged as SIMULATED — never presented as real.
        """
        comp3_fields = self.COMP3_PATTERN.findall(cobol_source)
        
        # Default to IBM Enterprise COBOL 6.3 defaults
        numproc = NumprocMode.PFD
        trunc = TruncMode.BIN
        arith = ArithMode.EXTEND
        
        numeric_directives = [
            NumericDirective(
                field_name=f[0],
                pic_clause=f"9({f[1]})" + (
                    f"V9({f[2]})" if f[2] else ""
                ),
                numproc_mode=numproc,
                trunc_mode=trunc,
                arith_mode=arith,
                precision_digits=int(f[1]),
                scale_digits=int(f[2]) if f[2] else 0
            )
            for f in comp3_fields
        ]
        
        return CompilerArtefact(
            program_name=program_name,
            compiler_version="IBM Enterprise COBOL 6.3 (SIMULATED)",
            compile_date="UNKNOWN",
            numproc_mode=numproc,
            trunc_mode=trunc,
            arith_mode=arith,
            numeric_directives=numeric_directives,
            field_references={},
            artefact_source="SIMULATED_FROM_SOURCE",  # honest flag
            completeness="PARTIAL"
        )
    
    # ── Private extraction methods ──────────────────────────
    
    def _extract_program_name(self, content: str) -> str:
        match = self.PROGRAM_ID_PATTERN.search(content)
        return match.group(1) if match else "UNKNOWN"
    
    def _extract_compiler_version(self, content: str) -> str:
        match = self.COMPILER_VERSION_PATTERN.search(content)
        return match.group(1) if match else "UNKNOWN"
    
    def _extract_compile_date(self, content: str) -> str:
        match = self.COMPILE_DATE_PATTERN.search(content)
        return match.group(1) if match else "UNKNOWN"
    
    def _extract_options_line(self, content: str) -> str:
        match = self.OPTIONS_PATTERN.search(content)
        return match.group(1) if match else ""
    
    def _parse_numproc(self, options: str) -> NumprocMode:
        match = self.NUMPROC_PATTERN.search(options)
        if match:
            return NumprocMode[match.group(1).upper()]
        return NumprocMode.PFD  # IBM default
    
    def _parse_trunc(self, options: str) -> TruncMode:
        match = self.TRUNC_PATTERN.search(options)
        if match:
            return TruncMode[match.group(1).upper()]
        return TruncMode.BIN  # IBM default
    
    def _parse_arith(self, options: str) -> ArithMode:
        match = self.ARITH_PATTERN.search(options)
        if match:
            return ArithMode[match.group(1).upper()]
        return ArithMode.EXTEND  # IBM default
    
    def _extract_cross_references(
        self, 
        content: str
    ) -> dict[str, list[int]]:
        """
        Extracts the field cross-reference table — showing
        exactly which line numbers reference each data field.
        This reveals execution patterns not visible in source.
        """
        refs = {}
        xref_section = content.split("Cross reference")
        if len(xref_section) < 2:
            return refs
            
        for match in self.XREF_PATTERN.finditer(
            xref_section[1]
        ):
            field_name = match.group(1)
            line_numbers = [
                int(n) for n in match.group(3).split()
                if n.isdigit()
            ]
            refs[field_name] = line_numbers
            
        return refs
    
    def _build_numeric_directives(
        self,
        content: str,
        numproc: NumprocMode,
        trunc: TruncMode,
        arith: ArithMode
    ) -> list[NumericDirective]:
        """
        Builds NumericDirective objects for every COMP-3 field,
        combining PIC clause precision with compiler options
        to derive exact runtime rounding behavior.
        """
        directives = []
        for match in self.COMP3_PATTERN.finditer(content):
            field_name = match.group(1)
            precision = int(match.group(2))
            scale = int(match.group(3)) if match.group(3) else 0
            
            directives.append(NumericDirective(
                field_name=field_name,
                pic_clause=(
                    f"9({precision})" + 
                    (f"V9({scale})" if scale else "")
                ),
                numproc_mode=numproc,
                trunc_mode=trunc,
                arith_mode=arith,
                precision_digits=precision,
                scale_digits=scale
            ))
            
        return directives