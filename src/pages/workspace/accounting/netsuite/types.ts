import type {ValueOf} from 'type-fest';
import type {MenuItemProps} from '@components/MenuItem';
import type {OfflineWithFeedbackProps} from '@components/OfflineWithFeedback';
import type {SelectorType} from '@components/SelectionScreen';
import type {SubStepProps} from '@hooks/useSubStep/types';
import type {ToggleSettingOptionRowProps} from '@pages/workspace/workflows/ToggleSettingsOptionRow';
import type CONST from '@src/CONST';
import type {Policy} from '@src/types/onyx';

type MenuItem = MenuItemProps & {
    /** Type of the item */
    type: 'menuitem';

    /** The type of action that's pending  */
    pendingAction: OfflineWithFeedbackProps['pendingAction'];

    /** Whether the item should be hidden */
    shouldHide?: boolean;

    /** Any error message to show */
    errors: OfflineWithFeedbackProps['errors'];

    /** Callback to close the error messages */
    onCloseError: OfflineWithFeedbackProps['onClose'];
};

type DividerLineItem = {
    /** Type of the item */
    type: 'divider';

    /** Unique key for the item */
    key: string;

    /** Whether the item should be hidden */
    shouldHide?: boolean;
};

type ToggleItem = ToggleSettingOptionRowProps & {
    /** Type of the item */
    type: 'toggle';

    /** Whether the item should be hidden */
    shouldHide?: boolean;
};

type ExpenseRouteParams = {
    expenseType: ValueOf<typeof CONST.NETSUITE_EXPENSE_TYPE>;
};

type CustomFieldSubStepWithPolicy = SubStepProps & {
    policyID: string;
    policy: Policy | undefined;
    importCustomField: ValueOf<typeof CONST.NETSUITE_CONFIG.IMPORT_CUSTOM_FIELDS>;
    customSegmentType?: ValueOf<typeof CONST.NETSUITE_CUSTOM_RECORD_TYPES>;
    setCustomSegmentType?: (segmentType: ValueOf<typeof CONST.NETSUITE_CUSTOM_RECORD_TYPES>) => void;
};

type CustomListSelectorType = SelectorType & {
    id: string;
};

export type {MenuItem, DividerLineItem, ToggleItem, ExpenseRouteParams, CustomFieldSubStepWithPolicy, CustomListSelectorType};
