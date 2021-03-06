import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { IKeyValuePair } from '../../models/key-value.interface';

type Option = IKeyValuePair<string>;

@Component({
	selector: 'ansyn-multi-choice-attribute',
	templateUrl: './multi-choice-attribute.component.html',
	styleUrls: ['./multi-choice-attribute.component.less'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiChoiceAttributeComponent {
	isMatChipSelectable = true;
	isMatChipRemovable = true;
	isOpen = false;
	addEntityLabel = 'Add Entity';

	@Output() onSelectOption = new EventEmitter<Option>();
	@Output() onRemoveOption = new EventEmitter<Option>();

	@Input() optionsList: Option[];
	@Input() selectedOptions: Option[] = [];
	@Input() set label(label: string) {
		this.addEntityLabel = 'Add ' + label;
	};
	constructor() {}

	selectOption(option: Option) {
		this.isOpen = false;
		this.onSelectOption.emit(option);
	}

	removeOption(option: Option) {
		this.onRemoveOption.emit(option);
	}

	toggleOpen() {
		this.isOpen = !this.isOpen;
	}
}
