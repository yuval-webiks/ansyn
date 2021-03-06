import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Inject,
	OnDestroy,
	OnInit,
	ViewChild,
	ViewEncapsulation
} from '@angular/core';
import { selection } from 'd3';
import * as d3 from 'd3/dist/d3';
import eventDrops from '@ansyn/event-drops';
import { OverlaysService } from '../../services/overlays.service';
import {
	IMarkUpData,
	IOverlaysState,
	ITimelineRange,
	MarkUpClass,
	MarkUpTypes,
	selectDropMarkup,
	selectDrops,
	selectTimelineRange
} from '../../reducers/overlays.reducer';
import { fromEvent, Observable, Subscription } from 'rxjs';
import { select, Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import {
	DisplayOverlayFromStoreAction,
	OverlaysActionTypes,
	RedrawTimelineAction,
	SetMarkUp, SetOverlaysStatusMessageAction,
	SetTimelineStateAction
} from '../../actions/overlays.actions';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { distinctUntilChanged, tap, withLatestFrom } from 'rxjs/operators';
import { isEqual } from 'lodash';
import { ExtendMap } from '../../reducers/extendedMap.class';
import { overlayOverviewComponentConstants } from '../overlay-overview/overlay-overview.component.const';
import { DOCUMENT } from '@angular/common';
import { IOverlayDrop } from '../../models/overlay.model';
import { TranslateService } from '@ngx-translate/core';
import { AutoSubscription, AutoSubscriptions } from 'auto-subscriptions';

export const BASE_DROP_COLOR = '#8cceff';
selection.prototype.moveToFront = function () {
	return this.each(function () {
		this.parentNode.appendChild(this);
	});
};

export interface IEventDropsEvent {
	id: string;
	date: Date;
}

@Component({
	selector: 'ansyn-timeline',
	templateUrl: './timeline.component.html',
	styleUrls: ['./timeline.component.less'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	encapsulation: ViewEncapsulation.None
})

@AutoSubscriptions()
export class TimelineComponent implements OnInit, OnDestroy {

	@ViewChild('context', { static: true }) context: ElementRef;

	configuration = {
		range: {
			start: new Date(Date.now()),
			end: new Date(Date.now())
		},
		locale: {
			'dateTime': '%x, %X',
			'date': '%-m/%-d/%Y',
			'time': '%-I:%M:%S %p',
			'periods': ['AM', 'PM'],
			'days': ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
			'shortDays': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
			'months': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
			'shortMonths': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
		},
		bound: {
			location: '-35'
		},
		margin: {
			top: 60,
			left: 10,
			bottom: 40,
			right: 10
		},
		line: {
			color: (d, i) => schemeCategory10[i]
		},
		drop: {
			onMouseOver: this.onMouseOver.bind(this),
			onMouseOut: this.onMouseOut.bind(this),
			onClick: this.clickEvent(),
			onDblClick: () => event.stopPropagation(),
			dropId: d => 'dropId-' + d.id,
			color: BASE_DROP_COLOR,
			date: d => new Date(d.date),
			filterOverlap: false
		},
		zoom: {
			onZoom: this.drawMarkup.bind(this),
			onZoomStart: null,
			onZoomEnd: this.onZoomEnd.bind(this),
			minimumScale: 1
		},
		label: {
			width: 0,
			padding: 0,
			text: ''
		},
		d3: d3
	};

	private chart: any;
	private element: any;
	private oldActiveId: string;

	@AutoSubscription
	redraw$: Observable<any> = this.actions$
		.pipe(
			ofType<RedrawTimelineAction>(OverlaysActionTypes.REDRAW_TIMELINE),
			withLatestFrom(this.store$.select(selectDrops)),
			tap(([action, drops]) => this.initEventDropsSequence(drops))
		);

	@AutoSubscription
	timeLineRange$: Observable<ITimelineRange> = this.store$
		.pipe(
			select(selectTimelineRange),
			tap((value: ITimelineRange) => this.configuration.range = value)
		);

	private markup: ExtendMap<MarkUpClass, IMarkUpData>;

	@AutoSubscription
	dropsMarkUp$: Observable<[ExtendMap<MarkUpClass, IMarkUpData>, any]> = this.store$
		.pipe(
			select(selectDropMarkup),
			withLatestFrom(this.store$.pipe(select(selectDrops))),
			tap(this.checkDifferenceInTimeRange.bind(this)),
			tap(([value]: [ExtendMap<MarkUpClass, IMarkUpData>, any]) => {
				this.markup = value;
				this.drawMarkup();
			})
		);

	dropsIdMap: Map<string, IOverlayDrop> = new Map();

	@AutoSubscription
	dropsChange$: Observable<IOverlayDrop[]> = this.store$
		.pipe(
			select(selectDrops),
			distinctUntilChanged(isEqual),
			tap((drops: any) => this.dropsIdMap = new Map(drops.map((drop) => [drop.id, drop]))),
			tap(drops => {
				if (drops.length >= 1) {
					this.configuration.range = this.overlaysService.getTimeRangeFromDrops(drops);
				}
				this.initEventDropsSequence(drops);
			})
		);

	@AutoSubscription
	onResize$: Observable<any> = fromEvent(window, 'resize')
		.pipe(
			withLatestFrom(this.store$.select(selectDrops)),
			tap(([event, drops]) => this.initEventDropsSequence(drops))
		);

	constructor(@Inject(OverlaysService) protected overlaysService: OverlaysService,
				protected elementRef: ElementRef,
				@Inject(DOCUMENT) protected document: any,
				protected store$: Store<IOverlaysState>,
				protected actions$: Actions,
				protected translator: TranslateService) {
	}

	addRStyle(): void {
		const circlesR: HTMLStyleElement = this.document.createElement('style');
		circlesR.innerText = ` circle.displayed, circle.active { r: 8; } `;
		this.elementRef.nativeElement.appendChild(circlesR);
	}

	ngOnInit() {
		this.addRStyle();
	}

	ngOnDestroy() {
	}

	onMouseOver({ id }: IEventDropsEvent): void {
		this.store$.dispatch(new SetMarkUp({ classToSet: MarkUpClass.hover, dataToSet: { overlaysIds: [id] } }));
	}

	onMouseOut({ id }: IEventDropsEvent): void {
		if (!d3.event.toElement || (d3.event.toElement && d3.event.toElement.id !== overlayOverviewComponentConstants.TRANSPARENT_DIV_ID)) {
			this.store$.dispatch(new SetMarkUp({ classToSet: MarkUpClass.hover, dataToSet: { overlaysIds: [] } }));
		}
	}

	clickEvent() {
		let down, wait;
		return (data: IEventDropsEvent) => {
			if (!down) {
				down = true;
				wait = setTimeout((() => {
					wait = null;
					this.onClick();
					down = false;
				}), 300);
			} else {
				this.onDblClick(data);
				if (wait) {
					window.clearTimeout(wait);
					wait = null;
					down = false;
				}
				return;
			}
		};
	}

	onDblClick({ id }): void {
		this.store$.dispatch(new DisplayOverlayFromStoreAction({ id }));
	}

	onClick(): void {
	}

	isNoOverlaysLeft(): boolean {
		const datesArray = this.chart.filteredData()[0].fullData;
		const [currentMinimumDate, currentMaximumDate] = this.getCurrentTimeLineRange();
		const minimumDate = datesArray[0].date;
		const maximumDate = datesArray[datesArray.length - 1].date;

		return ((currentMaximumDate < minimumDate) || (currentMinimumDate > maximumDate));
	}

	getCurrentTimeLineRange(): Date[] {
		return this.chart.scale().domain();
	}

	onZoomEnd(): void {
		const errorMessage = this.isNoOverlaysLeft() ? this.translator.instant('No overlays left there') : null;
		this.store$.dispatch(new SetOverlaysStatusMessageAction(errorMessage));
		const [start, end] = this.getCurrentTimeLineRange();

		this.store$.dispatch(new SetTimelineStateAction({ timeLineRange: { start, end } }));

	}

	initEventDropsSequence(drops): void {
		this.removeOldEventDrops();
		this.initEventDrop(drops);
		this.drawMarkup();
	}

	removeOldEventDrops(): void {
		if (this.element) {
			const existEventDrops = this.element.select('.event-drop-chart');
			if (existEventDrops) {
				existEventDrops.remove();
			}
		}
	}

	isTimeChanged(timeRange): boolean {
		const currentStartDate = this.configuration.range.start;
		const currentEndDate = this.configuration.range.end;
		const newStartDate = timeRange.start;
		const newSendDate = timeRange.end;

		return (newStartDate.getTime() !== currentStartDate.getTime()) || (newSendDate.getTime() !== currentEndDate.getTime());
	}

	checkDifferenceInTimeRange([newMarkUp, drops]: [ExtendMap<MarkUpClass, IMarkUpData>, any]): void {
		const newActive = newMarkUp.get(MarkUpClass.active).overlaysIds;
		if (!newActive || !newActive.length) {
			return;
		}
		const newActiveId = newActive[0];
		const isExist = Boolean(this.dropsIdMap.get(newActiveId));
		if (isExist && (!this.oldActiveId || this.oldActiveId !== newActiveId)) {
			const timeLineRange = this.overlaysService.getTimeStateByOverlay(this.dropsIdMap.get(newActiveId), this.configuration.range);
			if (this.isTimeChanged(timeLineRange)) {
				this.configuration.range = timeLineRange;
				this.initEventDropsSequence(drops);
			}
		}
		this.oldActiveId = newActiveId;
	}

	initEventDrop(drops): void {
		this.chart = eventDrops(this.configuration);
		this.element = d3.select(this.context.nativeElement);
		this.element
			.data([[{ data: drops }]])
			.call(this.chart);

		this.element.clone().select('.drops').append('g').classed('textContainer', true);
	}

	drawMarkup(): void {
		if (this.markup && this.element) {
			const dropsElements = this.element.selectAll('.drop');
			const textContainer = this.element.select('.textContainer');
			this.clearMarkUp(dropsElements);
			this.markup.keys.forEach(className => {
				const markUpData = this.markup.get(className);
				markUpData.overlaysIds.forEach(overlayId => {
					const dropElement = dropsElements.filter((d) => d.id === overlayId);
					if (!dropElement.empty()) {
						if (markUpData.type === MarkUpTypes.symbole) {
							this.appendLetters(textContainer, dropElement, markUpData.data);
						} else {
							const currentClassList = dropElement.attr('class');
							dropElement.attr('class', currentClassList.concat(' changedDrops ' + className));
						}
					}

				});
			});
			this.arrangeDrops(dropsElements, textContainer);
		}
	}

	appendLetters(textContainer, dropElement, symbol): void {
		textContainer.append('text')
			.classed('letters', true)
			.attr('x', dropElement.attr('cx'))
			.attr('y', dropElement.attr('cy') + 2)
			.attr('text-anchor', 'middle')
			.attr('fill', 'white')
			.attr('font-size', '12px')
			.attr('alignment-baseline', 'auto')
			.text(symbol);
	}

	clearMarkUp(dropsElements): void {
		dropsElements.filter('.changedDrops').attr('class', 'drop').style('filter', null);
		this.element.selectAll('.letters').remove();
	}

	arrangeDrops(drops, textContainer): void {
		const changeDrops = drops.filter('.changedDrops');
		if (!changeDrops.empty()) {
			this.moveToFront(changeDrops);
			const activeDrops = changeDrops.filter('.' + MarkUpClass.active);
			if (!activeDrops.empty()) {
				this.moveToFront(activeDrops);
			}
			const favoriteDrops = changeDrops.filter('.' + MarkUpClass.favorites);
			if (!favoriteDrops.empty()) {
				this.moveToFront(favoriteDrops);
				favoriteDrops.style('filter', 'url(#highlight)');
			}
		}
		this.moveToFront(textContainer);
	}

	moveToFront(element): void {
		element.each(function () {
			this.parentNode.appendChild(this);
		});
	}

}


