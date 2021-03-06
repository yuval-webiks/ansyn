import { Component, ElementRef, HostBinding, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { ComboBoxComponent } from '../combo-box/combo-box.component';
import { AutoSubscription, AutoSubscriptions } from 'auto-subscriptions';
import { debounceTime, tap } from 'rxjs/operators';
import { NgControl } from '@angular/forms';

@Component({
	selector: 'ansyn-combo-box-option',
	templateUrl: './combo-box-option.component.html',
	styleUrls: ['./combo-box-option.component.less']
})
@AutoSubscriptions({
	init: 'ngOnInit',
	destroy: 'ngOnDestroy'
})
export class ComboBoxOptionComponent implements OnInit, OnDestroy {

	get selected() {
		return this._parent.selected;
	}
	@Input() value;

	@HostBinding('class.disabled')
	@Input() disabled = false;


	@AutoSubscription
	selectedChanged$ = this._parent.injector.get(NgControl).valueChanges.pipe(
		debounceTime(1500),
		tap(selected => {
			if (selected) {
				if (selected === this.value) {
					this._parent.renderSelected = this.el.nativeElement.innerHTML;
				}
			} else {
				this._parent.renderSelected = '';
			}
		}));

	constructor(protected _parent: ComboBoxComponent, protected el: ElementRef) {
	}

	@HostListener('click') onClick() {
		if (this.value) {
			this._parent.selectOption(this.value);
		}
		this._parent.close();
	}

	ngOnInit() {
	}

	ngOnDestroy(): void {
	}

}
