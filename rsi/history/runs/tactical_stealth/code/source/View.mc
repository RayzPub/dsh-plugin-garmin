import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;
import Toybox.ActivityMonitor;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.Math;

class GarminWatchFaceView extends WatchUi.WatchFace {

    private var _isSleep as Boolean = false;
    private var _screenCenter as Number = 130;

    function initialize() {
        WatchFace.initialize();
    }

    function onLayout(dc as Graphics.Dc) as Void {
        _screenCenter = dc.getWidth() / 2;
    }

    function onShow() as Void {
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        // 1. Clear background
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();

        var cx = _screenCenter;
        var cy = _screenCenter;
        var clockTime = System.getClockTime();
        var sysStats = System.getSystemStats();
        var actInfo = ActivityMonitor.getInfo();

        // --- Dial Ticks ---
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        for (var i = 0; i < 60; i += 1) {
            var isMajor = (i % 5 == 0);
            var angleRad = (i * 6 * Math.PI) / 180.0;
            var tickLen = isMajor ? 8 : 4;
            var r1 = 124 - tickLen;
            var r2 = 124;
            var x1 = cx + r1 * Math.sin(angleRad);
            var y1 = cy - r1 * Math.cos(angleRad);
            var x2 = cx + r2 * Math.sin(angleRad);
            var y2 = cy - r2 * Math.cos(angleRad);
            dc.setPenWidth(isMajor ? 2 : 1);
            dc.drawLine(x1, y1, x2, y2);
        }

        // --- Digital Clock ---
        var timeStr = clockTime.hour.format("%02d") + ":" + clockTime.min.format("%02d");
        dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(130, 196, Graphics.FONT_NUMBER_HOT, timeStr, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Complication: Heart Rate (arc ring) (#1)
        var hrStr_0 = "--";
        var hrVal_0 = 0;
        if (actInfo has :heartRate && actInfo.heartRate != null && actInfo.heartRate != ActivityMonitor.INVALID_HR_SAMPLE) {
            hrStr_0 = actInfo.heartRate.toString();
            hrVal_0 = actInfo.heartRate;
        }
        var hrPct_0 = 0.0;
        if (hrVal_0 > 40) {
            hrPct_0 = (hrVal_0 - 40) / 140.0;
            if (hrPct_0 > 1.0) { hrPct_0 = 1.0; }
        }
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(4);
        drawArcRing(dc, 62, 92, 22, 135, 270);
        dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(4);
        drawArcRing(dc, 62, 92, 22, 135, hrPct_0 * 270.0);
        dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_TRANSPARENT);
        dc.drawText(62, 96, Graphics.FONT_XTINY, hrStr_0, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(62, 82, Graphics.FONT_XTINY, "HR", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Complication: Steps (arc ring) (#2)
        var stepCount_1 = 0;
        if (actInfo != null && actInfo.steps != null) {
            stepCount_1 = actInfo.steps;
        }
        var stepPct_1 = stepCount_1 / 10000.0;
        if (stepPct_1 > 1.0) { stepPct_1 = 1.0; }
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(4);
        drawArcRing(dc, 198, 92, 22, 135, 270);
        dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(4);
        drawArcRing(dc, 198, 92, 22, 135, stepPct_1 * 270.0);
        dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
        dc.drawText(198, 96, Graphics.FONT_XTINY, stepCount_1.toString(), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(198, 82, Graphics.FONT_XTINY, "STEP", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Complication: Battery (progress bar) (#3)
        var bat_2 = (sysStats != null && sysStats.battery != null) ? sysStats.battery.toNumber() : 0;
        var batCol_2 = (bat_2 <= 20) ? Graphics.COLOR_RED : Graphics.COLOR_ORANGE;
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(112, 226, 36, 6);
        dc.setColor(batCol_2, Graphics.COLOR_TRANSPARENT);
        var batW_2 = 36 * bat_2 / 100;
        if (batW_2 > 0) {
            dc.fillRectangle(112, 226, batW_2, 6);
        }
        dc.setColor(batCol_2, Graphics.COLOR_TRANSPARENT);
        dc.drawText(130, 220, Graphics.FONT_XTINY, bat_2.toString() + "%", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Complication: Date (#4)
        var now_3 = Time.now();
        var dateInfo_3 = Gregorian.info(now_3, Time.FORMAT_SHORT);
        var dateStr_3 = dateInfo_3.month.format("%02d") + "/" + dateInfo_3.day.format("%02d");
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(130, 56, Graphics.FONT_XTINY, dateStr_3, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        // --- Analog Hands ---
        var hAngle = ((clockTime.hour % 12 + clockTime.min / 60.0) * 30.0 * Math.PI) / 180.0;
        var mAngle = ((clockTime.min + clockTime.sec / 60.0) * 6.0 * Math.PI) / 180.0;

        // Hour Hand
        var hx = cx + 56 * Math.sin(hAngle);
        var hy = cy - 56 * Math.cos(hAngle);
        dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(6);
        dc.drawLine(cx, cy, hx, hy);

        // Minute Hand
        var mx = cx + 84 * Math.sin(mAngle);
        var my = cy - 84 * Math.cos(mAngle);
        dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(5);
        dc.drawLine(cx, cy, mx, my);

        // Second Hand (active only in high power / awake mode)
        if (!_isSleep) {
            var sAngle = (clockTime.sec * 6.0 * Math.PI) / 180.0;
            var sx = cx + 96 * Math.sin(sAngle);
            var sy = cy - 96 * Math.cos(sAngle);
            var stx = cx - 18 * Math.sin(sAngle);
            var sty = cy + 18 * Math.cos(sAngle);
            dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
            dc.setPenWidth(2);
            dc.drawLine(stx, sty, sx, sy);
            dc.fillCircle(cx, cy, 3);
        } else {
            dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
            dc.fillCircle(cx, cy, 4);
        }
    }

    // Helper to draw a smooth arc ring using line segments (zero-allocation hot path)
    function drawArcRing(dc as Graphics.Dc, ax as Number, ay as Number, ar as Number, startDeg as Number, sweepDeg as Number) as Void {
        if (sweepDeg <= 0) { return; }
        var segs = 24;
        var lastX = ax + ar * Math.sin(startDeg * Math.PI / 180.0);
        var lastY = ay - ar * Math.cos(startDeg * Math.PI / 180.0);
        for (var i = 1; i <= segs; i += 1) {
            var deg = startDeg + sweepDeg * i / segs;
            var rad = deg * Math.PI / 180.0;
            var nx = ax + ar * Math.sin(rad);
            var ny = ay - ar * Math.cos(rad);
            dc.drawLine(lastX, lastY, nx, ny);
            lastX = nx;
            lastY = ny;
        }
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
