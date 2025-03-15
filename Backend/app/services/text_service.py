import re
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class TextService:
    def chunk_text(self, text: str, strategy: str = "semantic"):
        """Split text into chunks based on strategy"""
        if strategy == "semantic":
            return self.chunk_by_headings(text)
        elif strategy == "fixed":
            return self.chunk_by_size(text)
        else:
            # Default to paragraph chunking
            return self.chunk_by_paragraphs(text)
    
    def chunk_by_headings(self, text: str) -> List[Dict]:
        """Split text by headings"""
        # Common heading patterns
        patterns = [
            r'(?:\n|^)#+\s+(.+?)(?:\n|$)',                # Markdown headings
            r'(?:\n|^)(?:CHAPTER|Section)\s+\d+[.:]\s*(.+?)(?:\n|$)',  # Chapter/Section headers
            r'(?:\n|^)(?:[A-Z][A-Za-z\s]+)(?:\n|$)',      # All caps headings
        ]
        
        # Combine patterns
        combined_pattern = '|'.join(f'({p})' for p in patterns)
        
        # Find potential headings
        headings = re.finditer(combined_pattern, text)
        
        chunks = []
        last_end = 0
        current_heading = "Introduction"
        
        for match in headings:
            # Extract heading text
            heading_text = match.group(0).strip()
            start = match.start()
            
            # Add previous chunk
            if start > last_end:
                chunk_text = text[last_end:start].strip()
                if chunk_text:
                    chunks.append({
                        "heading": current_heading,
                        "content": chunk_text
                    })
            
            # Update heading and position
            current_heading = heading_text
            last_end = match.end()
        
        # Add final chunk
        if last_end < len(text):
            chunks.append({
                "heading": current_heading,
                "content": text[last_end:].strip()
            })
        
        return chunks
    
    def chunk_by_paragraphs(self, text: str, min_length: int = 200) -> List[Dict]:
        """Split text by paragraphs"""
        # Split by double newline (common paragraph separator)
        paragraphs = re.split(r'\n\s*\n', text)
        
        chunks = []
        current_chunk = ""
        current_heading = "Text"
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # Check if this might be a heading
            if len(para) < 100 and para.endswith((':', '.')):
                current_heading = para
                current_chunk = ""
                continue
            
            current_chunk += para + "\n\n"
            
            # If chunk is long enough, add it
            if len(current_chunk) >= min_length:
                chunks.append({
                    "heading": current_heading,
                    "content": current_chunk.strip()
                })
                current_chunk = ""
        
        # Add remaining text
        if current_chunk:
            chunks.append({
                "heading": current_heading,
                "content": current_chunk.strip()
            })
        
        return chunks
    
    def chunk_by_size(self, text: str, max_tokens: int = 1000, overlap: int = 100) -> List[Dict]:
        """Split text by fixed size chunks with overlap"""
        # Approximate tokens by splitting on whitespace
        tokens = text.split()
        chunks = []
        
        for i in range(0, len(tokens), max_tokens - overlap):
            chunk_text = " ".join(tokens[i:i + max_tokens])
            
            # Try to find a good title for this chunk
            lines = chunk_text.split('\n')
            potential_title = None
            
            for line in lines[:5]:  # Check first few lines
                line = line.strip()
                if 10 < len(line) < 100 and line.endswith((':', '.')):
                    potential_title = line
                    break
            
            title = potential_title or f"Chunk {len(chunks) + 1}"
            
            chunks.append({
                "heading": title,
                "content": chunk_text
            })
        
        return chunks
