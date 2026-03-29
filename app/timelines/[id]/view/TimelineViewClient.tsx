'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RotateCcw, Hand, MousePointer, Download, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatRelativeTime, deriveCapacitySegments } from '@/lib/utils';
import { StatusChip } from '@/components/ui/StatusChip';

type Event = {
  id: number;
  name: string;
  date: string;
  description: string | null;
  type: string;
  impactSentiment: string;
  resourceCount: number | null;
  resourcesReturned: boolean;
  conclusionType: string | null;
  timelineId: number;
};

type Branch = {
  id: number;
  name: string;
  branchName: string;
  branchCloseMode: string | null;
  createdAt: string;
  events: Event[];
};

type Timeline = {
  id: number;
  name: string;
  description: string | null;
  isMain: boolean;
  project: {
    id: number;
    name: string;
    startDate: string;
    status: string;
    startingHeadcount: number;
    statusDate: string | null;
  };
  events: Event[];
};

const SENTIMENT_COLOR: Record<string, string> = {
  POSITIVE: '#648d78',
  NEGATIVE: '#ef9a9a',
  NEUTRAL: '#9aa3af',
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  DELIVERABLE: 'Deliverable',
  PRIORITY_CHANGE: 'Priority Change',
  STAFFING_CHANGE: 'Staffing Change',
  INITIATIVE: 'Initiative',
  KEY_DECISION: 'Key Decision',
  IMPEDIMENT: 'Impediment',
  FINISHED: 'Finished',
};

export function TimelineViewClient({
  timeline,
  branches,
  updatedAt,
}: {
  timeline: Timeline;
  branches: Branch[];
  updatedAt: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [panMode, setPanMode] = useState(false);
  const panModeRef = useRef(panMode);
  useEffect(() => { panModeRef.current = panMode; }, [panMode]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; event: Event;
  } | null>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setTooltip(null), 3000);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const allMainEvents = timeline.events;
  const project = timeline.project;

  const startDate = useMemo(() => new Date(project.startDate), [project.startDate]);

  const lastEventDate = useMemo(() =>
    allMainEvents.length > 0
      ? new Date(Math.max(...allMainEvents.map((e) => new Date(e.date).getTime())))
      : startDate,
  [allMainEvents, startDate]);

  const timelineEnd = useMemo(() => {
    const today = new Date();
    return project.status === 'Ongoing'
      ? new Date(Math.max(today.getTime(), lastEventDate.getTime()))
      : project.statusDate
        ? new Date(Math.max(new Date(project.statusDate).getTime(), lastEventDate.getTime()))
        : lastEventDate;
  }, [project.status, project.statusDate, lastEventDate]);

  const domainStart = useMemo(() => new Date(startDate.getTime() - 30 * 86400000), [startDate]);
  const domainEnd = useMemo(() => new Date(timelineEnd.getTime() + 30 * 86400000), [timelineEnd]);

  const capacitySegments = useMemo(() =>
    deriveCapacitySegments(project.startingHeadcount, allMainEvents, project.startDate),
  [project.startingHeadcount, allMainEvents, project.startDate]);

  const branchCapacitySegments = useMemo(() =>
    branches.map((branch) => {
      const firstWithCount = [...branch.events]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .find((e) => e.resourceCount != null);
      const startingHeadcount = firstWithCount?.resourceCount ?? 0;
      const originDate = branch.events.length > 0
        ? [...branch.events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].date
        : branch.createdAt;
      return deriveCapacitySegments(startingHeadcount, branch.events, originDate);
    }),
  [branches]);

  const globalMaxHeadcount = useMemo(() =>
    Math.max(
      ...capacitySegments.map((s) => s.headcount),
      ...branchCapacitySegments.flat().map((s) => s.headcount),
      1,
    ),
  [capacitySegments, branchCapacitySegments]);

  const drawTimeline = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const MARGIN = { top: 80, right: 60, bottom: 60, left: 60 };
    const TIMELINE_Y = height / 2;
    const CAPACITY_HEIGHT = 60;

    d3.select(svg).selectAll('*').remove();

    const root = d3.select(svg)
      .attr('width', width)
      .attr('height', height);

    // Defs
    const defs = root.append('defs');
    defs.append('clipPath')
      .attr('id', 'timeline-clip')
      .append('rect')
      .attr('x', MARGIN.left)
      .attr('y', 0)
      .attr('width', width - MARGIN.left - MARGIN.right)
      .attr('height', height);

    // Main group (zoom target)
    const g = root.append('g').attr('class', 'zoom-group');

    const xScale = d3.scaleTime()
      .domain([domainStart, domainEnd])
      .range([MARGIN.left, width - MARGIN.right]);

    /* ─── Capacity Band ─── */
    const capacityG = g.append('g').attr('class', 'capacity-band').attr('clip-path', 'url(#timeline-clip)');

    if (capacitySegments.length > 0) {
      const capacityArea = d3.area<{ date: Date; headcount: number }>()
        .x((d) => xScale(d.date))
        .y0((d) => TIMELINE_Y + (d.headcount / globalMaxHeadcount) * CAPACITY_HEIGHT / 2)
        .y1((d) => TIMELINE_Y - (d.headcount / globalMaxHeadcount) * CAPACITY_HEIGHT / 2)
        .curve(d3.curveStepAfter);

      // Build step data: extend last segment to end date
      const stepData = [
        ...capacitySegments,
        { date: domainEnd, headcount: capacitySegments[capacitySegments.length - 1].headcount },
      ];

      capacityG.append('path')
        .datum(stepData)
        .attr('d', capacityArea)
        .attr('fill', 'rgba(91, 141, 217, 0.12)')
        .attr('stroke', 'rgba(91, 141, 217, 0.3)')
        .attr('stroke-width', 1);

      // Headcount annotations
      capacitySegments.forEach((seg, i) => {
        if (i === 0 || seg.headcount !== capacitySegments[i - 1].headcount) {
          capacityG.append('text')
            .attr('x', xScale(seg.date) + 4)
            .attr('y', TIMELINE_Y - (seg.headcount / globalMaxHeadcount) * CAPACITY_HEIGHT / 2 - 4)
            .attr('font-size', '10px')
            .attr('fill', '#5b8dd9')
            .attr('font-family', 'Inter, sans-serif')
            .text(`${seg.headcount} ENG.`);
        }
      });
    }

    /* ─── Month Markers ─── */
    const monthMarkersG = g.append('g')
      .attr('class', 'month-markers')
      .attr('clip-path', 'url(#timeline-clip)');

    d3.timeMonth.range(domainStart, domainEnd).forEach((month) => {
      const x = xScale(month);

      monthMarkersG.append('line')
        .attr('x1', x).attr('x2', x)
        .attr('y1', MARGIN.top)
        .attr('y2', height)
        .attr('stroke', 'rgba(68,71,76,0.1)')
        .attr('stroke-width', 1);

      monthMarkersG.append('text')
        .attr('x', x + 3)
        .attr('y', TIMELINE_Y + CAPACITY_HEIGHT / 2 + 27)
        .attr('font-size', '9px')
        .attr('fill', 'rgba(68,71,76,0.45)')
        .attr('font-family', 'Inter, sans-serif')
        .text(d3.timeFormat('%b %Y')(month));
    });

    /* ─── Main Timeline Line ─── */
    const lineG = g.append('g').attr('clip-path', 'url(#timeline-clip)');

    lineG.append('line')
      .attr('x1', xScale(startDate))
      .attr('x2', xScale(timelineEnd))
      .attr('y1', TIMELINE_Y)
      .attr('y2', TIMELINE_Y)
      .attr('stroke', '#5b8dd9')
      .attr('stroke-width', 2);

    // Star marker at project start date
    lineG.append('path')
      .attr('d', d3.symbol(d3.symbolStar, 64)())
      .attr('transform', `translate(${xScale(startDate)}, ${TIMELINE_Y})`)
      .attr('fill', '#5b8dd9');

    // Today indicator — only for Ongoing projects
    if (project.status === 'Ongoing') {
      const todayX = xScale(new Date());
      lineG.append('circle')
        .attr('cx', todayX)
        .attr('cy', TIMELINE_Y)
        .attr('r', 7)
        .attr('fill', 'none')
        .attr('stroke', '#5b8dd9')
        .attr('stroke-width', 2);
      lineG.append('text')
        .attr('x', todayX)
        .attr('y', TIMELINE_Y - 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('fill', '#5b8dd9')
        .attr('font-family', 'Inter, sans-serif')
        .text('Today');
    }

    /* ─── Branch Lines ─── */
    branches.forEach((branch, bi) => {
      const sorted = [...branch.events].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      const finishedEvent = sorted.find((e) => e.type === 'FINISHED') ?? null;
      const originDate = sorted.length > 0
        ? new Date(sorted[0].date)
        : new Date(branch.createdAt);
      const closeDate = finishedEvent
        ? new Date(finishedEvent.date)
        : sorted.length > 0
          ? new Date(sorted[sorted.length - 1].date)
          : new Date(originDate.getTime() + 60 * 86400000);

      // Each branch needs vertical room for labels above + below its line
      const BRANCH_LABEL_CLEARANCE = 60; // px for event labels above the branch line
      const BRANCH_SPACING = 130;        // px between each branch and the one below it
      const branchY = TIMELINE_Y - BRANCH_LABEL_CLEARANCE - BRANCH_SPACING - bi * (BRANCH_SPACING + BRANCH_LABEL_CLEARANCE);

      const branchG = g.append('g').attr('clip-path', 'url(#timeline-clip)');

      // Thin blue band on vertical entry connector (main → branch), inside track = right of line
      const BAND_W = 4;
      const ox = xScale(originDate);
      branchG.append('rect')
        .attr('x', ox)
        .attr('y', branchY)
        .attr('width', BAND_W)
        .attr('height', TIMELINE_Y - branchY)
        .attr('fill', 'rgba(91, 141, 217, 0.12)')
        .attr('stroke', 'none');

      // Branch line
      branchG.append('path')
        .attr('d', `M ${xScale(originDate)} ${TIMELINE_Y} L ${xScale(originDate)} ${branchY} L ${xScale(closeDate)} ${branchY}`)
        .attr('stroke', '#8aaad4')
        .attr('stroke-width', 1.5)
        .attr('fill', 'none');

      // Flow arrows along branch line
      {
        const ARROW_INTERVAL = 100;
        const ARROW_SIZE = 5;
        const vertLen = TIMELINE_Y - branchY;
        const horizLen = xScale(closeDate) - ox;

        // Upward arrows on vertical segment
        const vertCount = Math.floor(vertLen / ARROW_INTERVAL);
        for (let k = 1; k <= vertCount; k++) {
          const ay = TIMELINE_Y - (k / (vertCount + 1)) * vertLen;
          branchG.append('path')
            .attr('d', `M ${ox - ARROW_SIZE} ${ay + ARROW_SIZE} L ${ox} ${ay - ARROW_SIZE} L ${ox + ARROW_SIZE} ${ay + ARROW_SIZE}`)
            .attr('stroke', '#8aaad4')
            .attr('stroke-width', 1.5)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('fill', 'none');
        }

        // Rightward arrows on horizontal segment
        if (horizLen > ARROW_INTERVAL) {
          const horizCount = Math.floor(horizLen / ARROW_INTERVAL);
          for (let k = 1; k <= horizCount; k++) {
            const ax = ox + (k / (horizCount + 1)) * horizLen;
            branchG.append('path')
              .attr('d', `M ${ax - ARROW_SIZE} ${branchY - ARROW_SIZE} L ${ax + ARROW_SIZE} ${branchY} L ${ax - ARROW_SIZE} ${branchY + ARROW_SIZE}`)
              .attr('stroke', '#8aaad4')
              .attr('stroke-width', 1.5)
              .attr('stroke-linecap', 'round')
              .attr('stroke-linejoin', 'round')
              .attr('fill', 'none');
          }
        }
      }

      // If finished and resources returned: thin blue band + dashed connector back down
      if (finishedEvent?.resourcesReturned) {
        const cx = xScale(closeDate);
        branchG.append('rect')
          .attr('x', cx - BAND_W)
          .attr('y', branchY)
          .attr('width', BAND_W)
          .attr('height', TIMELINE_Y - branchY)
          .attr('fill', 'rgba(91, 141, 217, 0.12)')
          .attr('stroke', 'none');
        branchG.append('path')
          .attr('d', `M ${cx} ${branchY} L ${cx} ${TIMELINE_Y}`)
          .attr('stroke', '#8aaad4')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none');

        // Downward arrows on return connector
        {
          const ARROW_INTERVAL = 100;
          const ARROW_SIZE = 5;
          const returnLen = TIMELINE_Y - branchY;
          const returnCount = Math.floor(returnLen / ARROW_INTERVAL);
          for (let k = 1; k <= returnCount; k++) {
            const ay = branchY + (k / (returnCount + 1)) * returnLen;
            branchG.append('path')
              .attr('d', `M ${cx - ARROW_SIZE} ${ay - ARROW_SIZE} L ${cx} ${ay + ARROW_SIZE} L ${cx + ARROW_SIZE} ${ay - ARROW_SIZE}`)
              .attr('stroke', '#8aaad4')
              .attr('stroke-width', 1.5)
              .attr('stroke-linecap', 'round')
              .attr('stroke-linejoin', 'round')
              .attr('fill', 'none');
          }
        }
      }

      // End symbol based on conclusion type
      if (finishedEvent) {
        const ex = xScale(closeDate);
        const conclusion = finishedEvent.conclusionType;
        if (conclusion === 'PAUSED') {
          // Two vertical bars (pause symbol)
          branchG.append('rect').attr('x', ex + 6).attr('y', branchY - 7).attr('width', 4).attr('height', 14).attr('fill', '#545e76').attr('rx', 1);
          branchG.append('rect').attr('x', ex + 14).attr('y', branchY - 7).attr('width', 4).attr('height', 14).attr('fill', '#545e76').attr('rx', 1);
        } else if (conclusion === 'CANCELLED') {
          // Red X
          branchG.append('line').attr('x1', ex + 6).attr('y1', branchY - 7).attr('x2', ex + 18).attr('y2', branchY + 7).attr('stroke', '#e53935').attr('stroke-width', 2.5).attr('stroke-linecap', 'round');
          branchG.append('line').attr('x1', ex + 18).attr('y1', branchY - 7).attr('x2', ex + 6).attr('y2', branchY + 7).attr('stroke', '#e53935').attr('stroke-width', 2.5).attr('stroke-linecap', 'round');
        } else if (conclusion === 'SUCCESSFUL') {
          // Green checkmark
          branchG.append('path')
            .attr('d', `M ${ex + 6} ${branchY} L ${ex + 10} ${branchY + 6} L ${ex + 20} ${branchY - 6}`)
            .attr('stroke', '#43a047')
            .attr('stroke-width', 2.5)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('fill', 'none');
        }
      }

      // Branch capacity band
      const bSegs = branchCapacitySegments[bi];
      if (bSegs.length > 0) {
        const branchArea = d3.area<{ date: Date; headcount: number }>()
          .x((d) => xScale(d.date))
          .y0((d) => branchY + (d.headcount / globalMaxHeadcount) * CAPACITY_HEIGHT / 2)
          .y1((d) => branchY - (d.headcount / globalMaxHeadcount) * CAPACITY_HEIGHT / 2)
          .curve(d3.curveStepAfter);

        const branchStepData = [
          ...bSegs,
          { date: closeDate, headcount: bSegs[bSegs.length - 1].headcount },
        ];

        branchG.append('path')
          .datum(branchStepData)
          .attr('d', branchArea)
          .attr('fill', 'rgba(91, 141, 217, 0.12)')
          .attr('stroke', 'rgba(91, 141, 217, 0.3)')
          .attr('stroke-width', 1);

        // Headcount annotations
        bSegs.forEach((seg, i) => {
          if (i === 0 || seg.headcount !== bSegs[i - 1].headcount) {
            branchG.append('text')
              .attr('x', xScale(seg.date) + 4)
              .attr('y', branchY - (seg.headcount / globalMaxHeadcount) * CAPACITY_HEIGHT / 2 - 4)
              .attr('font-size', '10px')
              .attr('fill', '#5b8dd9')
              .attr('font-family', 'Inter, sans-serif')
              .text(`${seg.headcount} ENG.`);
          }
        });
      }

      // Branch name label (left of line, above)
      branchG.append('text')
        .attr('x', xScale(originDate) + 4)
        .attr('y', branchY - 8)
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('fill', '#545e76')
        .attr('font-family', 'Inter, sans-serif')
        .text(branch.branchName);

      // Branch event dots + labels
      sorted.forEach((event, ei) => {
        const x = xScale(new Date(event.date));
        const color = SENTIMENT_COLOR[event.impactSentiment] ?? '#9aa3af';
        const above = ei % 2 === 0;
        const labelY = above ? branchY - 34 : branchY + 34;
        const lineY1 = above ? branchY - 8 : branchY + 8;
        const lineY2 = above ? branchY - 26 : branchY + 26;

        // Connector tick
        branchG.append('line')
          .attr('x1', x).attr('x2', x)
          .attr('y1', lineY1).attr('y2', lineY2)
          .attr('stroke', 'rgba(84,94,118,0.3)')
          .attr('stroke-width', 1);

        // Label group
        const labelG = branchG.append('g')
          .attr('transform', `translate(${x}, ${labelY})`);

        labelG.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', above ? -14 : 0)
          .attr('font-size', '9px')
          .attr('fill', '#545e76')
          .attr('font-family', 'Inter, sans-serif')
          .attr('letter-spacing', '0.05em')
          .text(EVENT_TYPE_LABEL[event.type] ?? event.type);

        labelG.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', above ? -3 : 11)
          .attr('font-size', '11px')
          .attr('font-weight', '600')
          .attr('fill', '#1a1c1e')
          .attr('font-family', 'Manrope, sans-serif')
          .text(event.name.length > 18 ? event.name.slice(0, 18) + '…' : event.name);

        labelG.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', above ? 8 : 22)
          .attr('font-size', '9px')
          .attr('fill', '#9aa3af')
          .attr('font-family', 'Inter, sans-serif')
          .text(formatDate(event.date));

        // Dot
        branchG.append('circle')
          .attr('cx', x)
          .attr('cy', branchY)
          .attr('r', 5)
          .attr('fill', color)
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .style('cursor', 'pointer')
          .on('mouseenter', (mouseEvent: MouseEvent) => {
            cancelHide();
            setTooltip({ x: mouseEvent.clientX, y: mouseEvent.clientY, event });
          })
          .on('mouseleave', () => scheduleHide());
      });
    });

    /* ─── Main Event Dots & Labels ─── */
    const eventsG = g.append('g').attr('clip-path', 'url(#timeline-clip)');

    allMainEvents.forEach((event, i) => {
      const x = xScale(new Date(event.date));
      const color = SENTIMENT_COLOR[event.impactSentiment] ?? '#9aa3af';
      const above = i % 2 === 0;
      const labelY = above ? TIMELINE_Y - 100 : TIMELINE_Y + 100;
      const lineY1 = above ? TIMELINE_Y - 8 : TIMELINE_Y + 8;
      const lineY2 = above ? TIMELINE_Y - 100 : TIMELINE_Y + 100;

      // Connector tick
      eventsG.append('line')
        .attr('x1', x).attr('x2', x)
        .attr('y1', lineY1).attr('y2', lineY2)
        .attr('stroke', 'rgba(68,71,76,0.3)')
        .attr('stroke-width', 1);

      // Label group
      const labelG = eventsG.append('g')
        .attr('transform', `translate(${x}, ${labelY})`);

      labelG.append('text')
        .attr('text-anchor', 'middle')
        .attr('y', above ? -14 : 0)
        .attr('font-size', '9px')
        .attr('fill', '#44474c')
        .attr('font-family', 'Inter, sans-serif')
        .attr('letter-spacing', '0.05em')
        .text(EVENT_TYPE_LABEL[event.type] ?? event.type);

      labelG.append('text')
        .attr('text-anchor', 'middle')
        .attr('y', above ? -3 : 11)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', '#1a1c1e')
        .attr('font-family', 'Manrope, sans-serif')
        .text(event.name.length > 18 ? event.name.slice(0, 18) + '…' : event.name);

      labelG.append('text')
        .attr('text-anchor', 'middle')
        .attr('y', above ? 8 : 22)
        .attr('font-size', '9px')
        .attr('fill', '#9aa3af')
        .attr('font-family', 'Inter, sans-serif')
        .text(formatDate(event.date));

      // Dot
      eventsG.append('circle')
        .attr('cx', x)
        .attr('cy', TIMELINE_Y)
        .attr('r', 6)
        .attr('fill', color)
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseenter', (mouseEvent: MouseEvent) => {
          cancelHide();
          setTooltip({ x: mouseEvent.clientX, y: mouseEvent.clientY, event });
        })
        .on('mouseleave', () => scheduleHide());
    });

    /* ─── Zoom behavior ─── */
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 8])
      .filter((event) => {
        if (event.type === 'wheel') return true;
        if (event.type === 'mousedown') return panModeRef.current;
        return true;
      })
      .on('zoom', (event) => {
        const t = event.transform;
        g.attr('transform', t);
        setZoomLevel(Math.round(t.k * 100) / 100);
      });

    zoomRef.current = zoom;
    d3.select(svg).call(zoom);
  }, [allMainEvents, branches, capacitySegments, domainStart, domainEnd, globalMaxHeadcount, branchCapacitySegments, startDate, timelineEnd, cancelHide, scheduleHide]);

  useEffect(() => {
    drawTimeline();
    const ro = new ResizeObserver(() => drawTimeline());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [drawTimeline]);

  function handleZoom(direction: 'in' | 'out') {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      zoomRef.current[direction === 'in' ? 'scaleBy' : 'scaleBy'],
      direction === 'in' ? 1.4 : 1 / 1.4,
    );
  }

  function handleReset() {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .call(zoomRef.current.transform, d3.zoomIdentity);
    setZoomLevel(1);
  }

  function handleDownload() {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${timeline.project.name}-timeline.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const STATUS_CHIP_MAP: Record<string, 'positive' | 'negative' | 'neutral'> = {
    Ongoing: 'neutral',
    Completed: 'positive',
    'On-Hold': 'negative',
    Cancelled: 'negative',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 bg-surface-container-highest shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <StatusChip
                variant={STATUS_CHIP_MAP[project.status] ?? 'neutral'}
                label={project.status.toUpperCase()}
              />
              <span className="text-xs text-on-surface-variant">
                Updated {formatRelativeTime(updatedAt)}
              </span>
            </div>
            <h1 className="font-display font-bold text-3xl text-on-surface">
              {timeline.project.name}
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              {formatDate(project.startDate)} – {project.status === 'Ongoing' ? 'Current' : project.statusDate ? formatDate(project.statusDate) : 'Current'}
            </p>
            {timeline.description && (
              <p className="text-sm text-on-surface-variant mt-1">{timeline.description}</p>
            )}
          </div>
          <Link
            href={`/timelines/${timeline.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors shrink-0 mt-1"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Configure
          </Link>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-8 py-3 bg-surface-container-low shrink-0">
        <button
          onClick={() => setPanMode(false)}
          aria-label="Select/pointer mode"
          className={`p-2 rounded-lg transition-colors ${!panMode ? 'bg-surface-container-highest text-on-surface' : 'text-on-surface-variant hover:bg-surface-container'}`}
        >
          <MousePointer className="w-4 h-4" />
        </button>
        <button
          onClick={() => setPanMode(true)}
          aria-label="Pan mode"
          className={`p-2 rounded-lg transition-colors ${panMode ? 'bg-surface-container-highest text-on-surface' : 'text-on-surface-variant hover:bg-surface-container'}`}
        >
          <Hand className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-outline-variant mx-1" />
        <button
          onClick={() => handleZoom('out')}
          aria-label="Zoom out"
          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs text-on-surface-variant w-10 text-center">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={() => handleZoom('in')}
          aria-label="Zoom in"
          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-outline-variant mx-1" />
        <button
          onClick={handleReset}
          aria-label="Reset zoom"
          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button
          onClick={handleDownload}
          aria-label="Download SVG"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export SVG
        </button>
      </div>

      {/* D3 Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-surface">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ cursor: panMode ? 'grab' : 'default' }}
        />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 bg-inverse-surface text-surface rounded-lg px-3 py-2 text-xs shadow-lg max-w-xs"
            style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
          >
            <div className="font-semibold font-display mb-0.5">{tooltip.event.name}</div>
            <div className="opacity-70 mb-1">{EVENT_TYPE_LABEL[tooltip.event.type]}</div>
            <div className="opacity-70">{formatDate(tooltip.event.date)}</div>
            {tooltip.event.description && (
              <div className="opacity-70 mt-1 border-t border-white/20 pt-1">
                {tooltip.event.description}
              </div>
            )}
            {tooltip.event.resourceCount != null && (
              <div className="opacity-70 mt-1">{tooltip.event.resourceCount} engineers</div>
            )}
          </div>
        )}

        {allMainEvents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant">
            <div className="text-center">
              <p className="font-display text-xl font-semibold mb-2">No events yet</p>
              <p className="text-sm">
                Add events in the{' '}
                <a href={`/timelines/${timeline.id}`} className="underline">
                  timeline configuration
                </a>{' '}
                to see them here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
