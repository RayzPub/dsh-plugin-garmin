import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;
import Toybox.ActivityMonitor;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.Math;

class GarminWatchFaceView extends WatchUi.WatchFace {

    // Screen geometry (260x260 round, center 130,130). Set in onLayout.
    private var _cx as Number = 130;
    private var _cy as Number = 130;

    // Cached compact label slices (avoid array-literal typed fields & per-update alloc).
    // Index 0..6 -> SUN..SAT ; index 0..11 -> JAN..DEC
    private var _dowNames as String = "SUNMONTUEWEDTHUFRISAT";
    private var _monNames as String = "JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC";

    // Sleep / low-power state
    private var _isSleep as Boolean = false;

    // Garmin default step goal fallback when Info.stepGoal is unavailable
    private var _stepGoalFallback as Number = 10000;

    function initialize() {
        WatchFace.initialize();
    }

    function onLayout(dc as Graphics.Dc) as Void {
        _cx = dc.getWidth() / 2;
        _cy = dc.getHeight() / 2;
    }

    function onShow() as Void {
    }

    // ---- Drawing helpers (use only standard Graphics primitives) ----

    // Draw a circular arc as connected line segments.
    // startDeg: angle in degrees, 0 = top (12 o'clock), increasing clockwise.
    // sweepDeg: arc length in degrees. ~3 deg/segment keeps a 7px ring gap-free.
    function drawArcSegments(dc as Graphics.Dc, cx as Number, cy as Number,
                             r as Number, startDeg as Number, sweepDeg as Number,
                             color as Number, penWidth as Number) as Void {
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(penWidth);
        var segs = sweepDeg / 3.0;
        if (segs < 1) {
            return;
        }
        var step = sweepDeg / segs;
        var toRad = Math.PI / 180.0;
        for (var i = 0; i < segs; i += 1) {
            var a0 = (startDeg + i * step) * toRad;
            var a1 = (startDeg + (i + 1) * step) * toRad;
            dc.drawLine(cx + r * Math.sin(a0), cy - r * Math.cos(a0),
                        cx + r * Math.sin(a1), cy - r * Math.cos(a1));
        }
    }

    // Insert thousands separators via direct string concatenation (no array alloc).
    function formatGrouped(value as Number) as String {
        var n = value;
        if (n < 0) { n = -n; }
        var s = n.toString();
        var len = s.length();
        var out = "";
        for (var i = 0; i < len; i += 1) {
            if (i > 0 && (len - i) % 3 == 0) {
                out = out + ",";
            }
            out = out + s.substring(i, i + 1);
        }
        return out;
    }

    // Draw a small filled heart icon centered at (x, y).
    function drawHeart(dc as Graphics.Dc, x as Number, y as Number,
                       sz as Number, color as Number) as Void {
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        var lobeR = sz * 0.28;
        var dx = sz * 0.22;
        dc.fillCircle(x - dx, y - sz * 0.12, lobeR);
        dc.fillCircle(x + dx, y - sz * 0.12, lobeR);
        dc.fillTriangle(x - sz * 0.5, y - sz * 0.05,
                        x + sz * 0.5, y - sz * 0.05,
                        x, y + sz * 0.5);
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        // 1. Clear background (pure black for max MIP contrast)
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();

        var cx = _cx;
        var cy = _cy;
        var clockTime = System.getClockTime();
        var sysStats = System.getSystemStats();
        var actInfo = ActivityMonitor.getInfo();

        // ---- Sleep / low-power mode: minimal face (time only) ----
        if (_isSleep) {
            var sleepTime = clockTime.hour.format("%02d") + ":" + clockTime.min.format("%02d");
            dc.setColor(Graphics.COLOR_DK_GREEN, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, cy, Graphics.FONT_NUMBER_HOT, sleepTime,
                        Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            return;
        }

        // ---- Gather activity data defensively ----
        var steps = 0;
        if (actInfo != null && actInfo has :steps && actInfo.steps != null) {
            steps = actInfo.steps;
        }
        var goal = _stepGoalFallback;
        if (actInfo != null && actInfo has :stepGoal && actInfo.stepGoal != null && actInfo.stepGoal > 0) {
            goal = actInfo.stepGoal;
        }

        // ---- Step progress ring (outer, fluorescent green over dark-gray track) ----
        var ringR = 118;
        var ringW = 7;
        drawArcSegments(dc, cx, cy, ringR, 0, 360, Graphics.COLOR_DK_GRAY, ringW);
        var pct = 0.0;
        if (goal > 0) {
            pct = steps / goal;
            if (pct > 1.0) { pct = 1.0; }
        }
        if (pct > 0.0) {
            drawArcSegments(dc, cx, cy, ringR, 0, 360.0 * pct, Graphics.COLOR_GREEN, ringW);
        }

        // ---- Large digital clock (fluorescent green) ----
        var timeStr = clockTime.hour.format("%02d") + ":" + clockTime.min.format("%02d");
        dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, 96, Graphics.FONT_NUMBER_HOT, timeStr,
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // ---- Steps label + value (inside ring, below time) ----
        dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, 128, Graphics.FONT_XTINY, "STEPS",
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, 144, Graphics.FONT_SMALL, formatGrouped(steps),
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // ---- Date display (cyan) ----
        var info = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
        var dowIdx = info.day_of_week;
        var monIdx = info.month - 1;
        var dowStr = _dowNames.substring(dowIdx * 3, dowIdx * 3 + 3);
        var monStr = _monNames.substring(monIdx * 3, monIdx * 3 + 3);
        var dateStr = dowStr + " " + info.day.format("%02d") + " " + monStr;
        dc.setColor(Graphics.COLOR_CYAN, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, 170, Graphics.FONT_SMALL, dateStr,
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // ---- Heart rate widget (bottom-left, red) ----
        var hrStr = "--";
        if (actInfo != null && actInfo has :heartRate && actInfo.heartRate != null
            && actInfo.heartRate != ActivityMonitor.INVALID_HR_SAMPLE) {
            hrStr = actInfo.heartRate.toString();
        }
        drawHeart(dc, 44, 208, 16, Graphics.COLOR_RED);
        dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_TRANSPARENT);
        dc.drawText(72, 208, Graphics.FONT_MEDIUM, hrStr,
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(98, 210, Graphics.FONT_XTINY, "bpm",
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // ---- Calorie widget (bottom-right, orange) ----
        var calStr = "--";
        if (actInfo != null && actInfo has :calories && actInfo.calories != null) {
            calStr = actInfo.calories.toString();
        }
        dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(162, 210, Graphics.FONT_XTINY, "kcal",
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.drawText(192, 208, Graphics.FONT_MEDIUM, calStr,
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.fillCircle(216, 208, 3);

        // ---- Battery (bottom-center, small; red when low) ----
        var bat = 0;
        if (sysStats != null && sysStats.battery != null) {
            bat = sysStats.battery.toNumber();
        }
        var batCol = (bat <= 20) ? Graphics.COLOR_RED : Graphics.COLOR_DK_GRAY;
        dc.setColor(batCol, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, 230, Graphics.FONT_XTINY, bat.toString() + "%",
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    function onHide() as Void {
    }

    function onExitSleep() as Void {
        _isSleep = false;
        WatchUi.requestUpdate();
    }

    function onEnterSleep() as Void {
        _isSleep = true;
        WatchUi.requestUpdate();
    }
}
