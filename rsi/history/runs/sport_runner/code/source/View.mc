import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;
import Toybox.ActivityMonitor;
import Toybox.SensorHistory;
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
        dc.setColor(Graphics.COLOR_BLUE, Graphics.COLOR_TRANSPARENT);
        for (var i = 0; i < 60; i += 5) {
            var isMajor = (i % 5 == 0);
            var angleRad = (i * 6 * Math.PI) / 180.0;
            var tickLen = isMajor ? 8 : 4;
            var r1 = 122 - tickLen;
            var r2 = 122;
            var x1 = cx + r1 * Math.sin(angleRad);
            var y1 = cy - r1 * Math.cos(angleRad);
            var x2 = cx + r2 * Math.sin(angleRad);
            var y2 = cy - r2 * Math.cos(angleRad);
            dc.setPenWidth(isMajor ? 2 : 1);
            dc.drawLine(x1, y1, x2, y2);
        }

        // --- Digital Clock ---
        var timeStr = clockTime.hour.format("%02d") + ":" + clockTime.min.format("%02d");
        dc.setColor(0x00FFAA, Graphics.COLOR_TRANSPARENT);
        dc.drawText(130, 105, Graphics.FONT_NUMBER_HOT, timeStr, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        if (!_isSleep) {
            var secStr = clockTime.sec.format("%02d");
            dc.drawText(190, 95, Graphics.FONT_XTINY, secStr, Graphics.TEXT_JUSTIFY_LEFT);
        }

        // Complication: Steps (arc ring) (#1)
        var stepCount_0 = 0;
        if (actInfo != null && actInfo.steps != null) {
            stepCount_0 = actInfo.steps;
        }
        var stepPct_0 = stepCount_0 / 10000.0;
        if (stepPct_0 > 1.0) { stepPct_0 = 1.0; }
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(4);
        drawArcRing(dc, 130, 55, 22, 135, 270);
        dc.setColor(Graphics.COLOR_BLUE, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(4);
        drawArcRing(dc, 130, 55, 22, 135, stepPct_0 * 270.0);
        dc.setColor(Graphics.COLOR_BLUE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(130, 59, Graphics.FONT_XTINY, stepCount_0.toString(), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(130, 45, Graphics.FONT_XTINY, "STEP", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Complication: Heart Rate (#2)
        var hrStr_1 = "--";
        if (actInfo has :heartRate && actInfo.heartRate != null && actInfo.heartRate != ActivityMonitor.INVALID_HR_SAMPLE) {
            hrStr_1 = actInfo.heartRate.toString();
        }
        dc.setColor(Graphics.COLOR_PINK, Graphics.COLOR_TRANSPARENT);
        dc.drawText(80, 165, Graphics.FONT_XTINY, "HR " + hrStr_1, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Complication: Calories (#3)
        var cal_2 = 0;
        if (actInfo != null && actInfo.calories != null) {
            cal_2 = actInfo.calories;
        }
        dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
        dc.drawText(180, 165, Graphics.FONT_XTINY, "CAL " + cal_2.toString(), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Complication: Date (badge window) (#4)
        var now_3 = Time.now();
        var dateInfo_3 = Gregorian.info(now_3, Time.FORMAT_SHORT);
        var dateStr_3 = dateInfo_3.month.format("%02d") + "/" + dateInfo_3.day.format("%02d");
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(104, 197, 52, 16);
        dc.setColor(0x00FFAA, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(1);
        dc.drawLine(104, 197, 156, 197);
        dc.drawLine(156, 197, 156, 213);
        dc.drawLine(156, 213, 104, 213);
        dc.drawLine(104, 213, 104, 197);
        dc.drawText(130, 205, Graphics.FONT_XTINY, dateStr_3, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
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
