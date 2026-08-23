from typing import TypedDict, List, Dict, Any, Optional

class DirectorState(TypedDict):
    # Input
    story_input: Optional[str]
    script_input: Optional[str]
    target_duration: float
    
    # Story Analysis Outputs
    theme: Optional[str]
    character_bible: List[Dict[str, Any]]
    location_bible: List[Dict[str, Any]]
    visual_style_prefix: Optional[str]
    narrative_beats: List[Dict[str, Any]]

    # Planned Shots
    shot_outlines: List[Dict[str, Any]]
    
    # Fully detailed Shots (Shot Model compliant)
    detailed_shots: List[Dict[str, Any]]
    
    # Continuity & Verification Issues
    continuity_issues: List[str]
    is_continuity_passed: bool
    
    # Status & Progress
    current_step: str
    progress_percentage: int
    error_message: Optional[str]
