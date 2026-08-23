from typing import Dict, Any, List
from app.agents.director.state import DirectorState

async def continuity_checker_node(state: DirectorState) -> Dict[str, Any]:
    detailed_shots = state.get("detailed_shots", [])
    issues: List[str] = []

    # Check 180-degree rule / Screen Direction Jump
    prev_direction = None
    for shot in detailed_shots:
        current_dir = shot.get("continuity_data", {}).get("screen_direction")
        if prev_direction and current_dir and prev_direction != current_dir and current_dir != "static":
            # Potential screen direction reverse
            issues.append(f"Shot {shot['order']} 轴线方向从 {prev_direction} 突变为 {current_dir}，请确认是否为刻意反切。")
        prev_direction = current_dir

    return {
        "continuity_issues": issues,
        "is_continuity_passed": len(issues) == 0,
        "current_step": "continuity_verified",
        "progress_percentage": 100
    }
