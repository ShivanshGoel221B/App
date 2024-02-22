import lodashGet from 'lodash/get';
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {InteractionManager, View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import _ from 'underscore';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import Button from '@components/Button';
import ConfirmModal from '@components/ConfirmModal';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import * as Expensicons from '@components/Icon/Expensicons';
import * as Illustrations from '@components/Icon/Illustrations';
import MessagesRow from '@components/MessagesRow';
import networkPropTypes from '@components/networkPropTypes';
import {withNetwork} from '@components/OnyxProvider';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import TableListItem from '@components/SelectionList/TableListItem';
import Text from '@components/Text';
import withCurrentUserPersonalDetails, {withCurrentUserPersonalDetailsDefaultProps, withCurrentUserPersonalDetailsPropTypes} from '@components/withCurrentUserPersonalDetails';
import withLocalize, {withLocalizePropTypes} from '@components/withLocalize';
import withWindowDimensions, {windowDimensionsPropTypes} from '@components/withWindowDimensions';
import usePrevious from '@hooks/usePrevious';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';
import compose from '@libs/compose';
import * as DeviceCapabilities from '@libs/DeviceCapabilities';
import Log from '@libs/Log';
import Navigation from '@libs/Navigation/Navigation';
import * as OptionsListUtils from '@libs/OptionsListUtils';
import * as PersonalDetailsUtils from '@libs/PersonalDetailsUtils';
import * as PolicyUtils from '@libs/PolicyUtils';
import * as UserUtils from '@libs/UserUtils';
import personalDetailsPropType from '@pages/personalDetailsPropType';
import * as Policy from '@userActions/Policy';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import SearchInputManager from './SearchInputManager';
import {policyDefaultProps, policyPropTypes} from './withPolicy';
import withPolicyAndFullscreenLoading from './withPolicyAndFullscreenLoading';
import Badge from "@components/Badge";

const propTypes = {
    /** All personal details asssociated with user */
    personalDetails: PropTypes.objectOf(personalDetailsPropType),

    /** URL Route params */
    route: PropTypes.shape({
        /** Params from the URL path */
        params: PropTypes.shape({
            /** policyID passed via route: /workspace/:policyID/members */
            policyID: PropTypes.string,
        }),
    }).isRequired,

    /** Session info for the currently logged in user. */
    session: PropTypes.shape({
        /** Currently logged in user accountID */
        accountID: PropTypes.number,
    }),

    isLoadingReportData: PropTypes.bool,
    ...policyPropTypes,
    ...withLocalizePropTypes,
    ...windowDimensionsPropTypes,
    ...withCurrentUserPersonalDetailsPropTypes,
    network: networkPropTypes.isRequired,
};

const defaultProps = {
    personalDetails: {},
    session: {
        accountID: 0,
    },
    isLoadingReportData: true,
    ...policyDefaultProps,
    ...withCurrentUserPersonalDetailsDefaultProps,
};

function WorkspaceMembersPage(props) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [removeMembersConfirmModalVisible, setRemoveMembersConfirmModalVisible] = useState(false);
    const [errors, setErrors] = useState({});
    const prevIsOffline = usePrevious(props.network.isOffline);
    const accountIDs = useMemo(() => _.map(_.keys(props.policyMembers), (accountID) => Number(accountID)), [props.policyMembers]);
    const prevAccountIDs = usePrevious(accountIDs);
    const textInputRef = useRef(null);
    const isOfflineAndNoMemberDataAvailable = _.isEmpty(props.policyMembers) && props.network.isOffline;
    const prevPersonalDetails = usePrevious(props.personalDetails);
    const {isSmallScreenWidth} = useWindowDimensions();

    useEffect(() => () => (SearchInputManager.searchInput = ''), []);

    /**
     * Get filtered personalDetails list with current policyMembers
     * @param {Object} policyMembers
     * @param {Object} personalDetails
     * @returns {Object}
     */
    const filterPersonalDetails = (policyMembers, personalDetails) =>
        _.reduce(
            _.keys(policyMembers),
            (result, key) => {
                if (personalDetails[key]) {
                    return {
                        ...result,
                        [key]: personalDetails[key],
                    };
                }
                return result;
            },
            {},
        );

    /**
     * Get members for the current workspace
     */
    const getWorkspaceMembers = useCallback(() => {
        Policy.openWorkspaceMembersPage(props.route.params.policyID, _.keys(PolicyUtils.getMemberAccountIDsForWorkspace(props.policyMembers, props.personalDetails)));
    }, [props.route.params.policyID, props.policyMembers, props.personalDetails]);

    /**
     * Check if the current selection includes members that cannot be removed
     */
    const validateSelection = useCallback(() => {
        const newErrors = {};
        const ownerAccountID = _.first(PersonalDetailsUtils.getAccountIDsByLogins(props.policy.owner ? [props.policy.owner] : []));
        _.each(selectedEmployees, (member) => {
            if (member !== ownerAccountID && member !== props.session.accountID) {
                return;
            }
            newErrors[member] = props.translate('workspace.people.error.cannotRemove');
        });
        setErrors(newErrors);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedEmployees, props.policy.owner, props.session.accountID]);

    useEffect(() => {
        getWorkspaceMembers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        validateSelection();
    }, [props.preferredLocale, validateSelection]);

    useEffect(() => {
        if (removeMembersConfirmModalVisible && !_.isEqual(accountIDs, prevAccountIDs)) {
            setRemoveMembersConfirmModalVisible(false);
        }
        setSelectedEmployees((prevSelected) => {
            // Filter all personal details in order to use the elements needed for the current workspace
            const currentPersonalDetails = filterPersonalDetails(props.policyMembers, props.personalDetails);
            // We need to filter the previous selected employees by the new personal details, since unknown/new user id's change when transitioning from offline to online
            const prevSelectedElements = _.map(prevSelected, (id) => {
                const prevItem = lodashGet(prevPersonalDetails, id);
                const res = _.find(_.values(currentPersonalDetails), (item) => lodashGet(prevItem, 'login') === lodashGet(item, 'login'));
                return lodashGet(res, 'accountID', id);
            });
            return _.intersection(prevSelectedElements, _.values(PolicyUtils.getMemberAccountIDsForWorkspace(props.policyMembers, props.personalDetails)));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.policyMembers]);

    useEffect(() => {
        const isReconnecting = prevIsOffline && !props.network.isOffline;
        if (!isReconnecting) {
            return;
        }
        getWorkspaceMembers();
    }, [props.network.isOffline, prevIsOffline, getWorkspaceMembers]);

    /**
     * Open the modal to invite a user
     */
    const inviteUser = () => {
        Navigation.navigate(ROUTES.WORKSPACE_INVITE.getRoute(props.route.params.policyID));
    };

    /**
     * Remove selected users from the workspace
     * Please see https://github.com/Expensify/App/blob/main/README.md#Security for more details
     */
    const removeUsers = () => {
        if (!_.isEmpty(errors)) {
            return;
        }

        // Remove the admin from the list
        const accountIDsToRemove = _.without(selectedEmployees, props.session.accountID);

        Policy.removeMembers(accountIDsToRemove, props.route.params.policyID);
        setSelectedEmployees([]);
        setRemoveMembersConfirmModalVisible(false);
    };

    /**
     * Show the modal to confirm removal of the selected members
     */
    const askForConfirmationToRemove = () => {
        if (!_.isEmpty(errors)) {
            return;
        }
        setRemoveMembersConfirmModalVisible(true);
    };

    /**
     * Add or remove all users passed from the selectedEmployees list
     * @param {Object} memberList
     */
    const toggleAllUsers = (memberList) => {
        const enabledAccounts = _.filter(memberList, (member) => !member.isDisabled);
        const everyoneSelected = _.every(enabledAccounts, (member) => _.contains(selectedEmployees, member.accountID));

        if (everyoneSelected) {
            setSelectedEmployees([]);
        } else {
            const everyAccountId = _.map(enabledAccounts, (member) => member.accountID);
            setSelectedEmployees(everyAccountId);
        }

        validateSelection();
    };

    /**
     * Add user from the selectedEmployees list
     *
     * @param {String} login
     */
    const addUser = useCallback(
        (accountID) => {
            setSelectedEmployees((prevSelected) => [...prevSelected, accountID]);
            validateSelection();
        },
        [validateSelection],
    );

    /**
     * Remove user from the selectedEmployees list
     *
     * @param {String} login
     */
    const removeUser = useCallback(
        (accountID) => {
            setSelectedEmployees((prevSelected) => _.without(prevSelected, accountID));
            validateSelection();
        },
        [validateSelection],
    );

    /**
     * Toggle user from the selectedEmployees list
     *
     * @param {String} accountID
     * @param {String} pendingAction
     *
     */
    const toggleUser = useCallback(
        (accountID, pendingAction) => {
            if (pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE) {
                return;
            }

            // Add or remove the user if the checkbox is enabled
            if (_.contains(selectedEmployees, accountID)) {
                removeUser(accountID);
            } else {
                addUser(accountID);
            }
        },
        [selectedEmployees, addUser, removeUser],
    );

    /**
     * Dismisses the errors on one item
     *
     * @param {Object} item
     */
    const dismissError = useCallback(
        (item) => {
            if (item.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE) {
                Policy.clearDeleteMemberError(props.route.params.policyID, item.accountID);
            } else {
                Policy.clearAddMemberError(props.route.params.policyID, item.accountID);
            }
        },
        [props.route.params.policyID],
    );

    /**
     * Check if the policy member is deleted from the workspace
     *
     * @param {Object} policyMember
     * @returns {Boolean}
     */
    const isDeletedPolicyMember = (policyMember) => !props.network.isOffline && policyMember.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE && _.isEmpty(policyMember.errors);
    const policyOwner = lodashGet(props.policy, 'owner');
    const currentUserLogin = lodashGet(props.currentUserPersonalDetails, 'login');
    const policyID = lodashGet(props.route, 'params.policyID');
    const invitedPrimaryToSecondaryLogins = _.invert(props.policy.primaryLoginsInvited);

    const getMemberOptions = () => {
        let result = [];

        _.each(props.policyMembers, (policyMember, accountIDKey) => {
            const accountID = Number(accountIDKey);
            if (isDeletedPolicyMember(policyMember)) {
                return;
            }

            const details = props.personalDetails[accountID];

            if (!details) {
                Log.hmmm(`[WorkspaceMembersPage] no personal details found for policy member with accountID: ${accountID}`);
                return;
            }

            // If this policy is owned by Expensify then show all support (expensify.com or team.expensify.com) emails
            // We don't want to show guides as policy members unless the user is a guide. Some customers get confused when they
            // see random people added to their policy, but guides having access to the policies help set them up.
            if (PolicyUtils.isExpensifyTeam(details.login || details.displayName)) {
                if (policyOwner && currentUserLogin && !PolicyUtils.isExpensifyTeam(policyOwner) && !PolicyUtils.isExpensifyTeam(currentUserLogin)) {
                    return;
                }
            }

            const isOwner = props.policy.owner === details.login;
            const isAdmin = props.session.email === details.login || policyMember.role === CONST.POLICY.ROLE.ADMIN;

            let roleBadge = null;
            if (isOwner || isAdmin) {
                roleBadge = (
                    <Badge
                        text={isOwner ? props.translate('common.owner') : props.translate('common.admin')}
                        textStyles={styles.textStrong}
                        badgeStyles={[
                            styles.justifyContentCenter,
                            StyleUtils.getMinimumWidth(60),
                            styles.mr3,
                        ]}
                    />
                );
            }

            result.push({
                keyForList: accountIDKey,
                accountID,
                isSelected: _.contains(selectedEmployees, accountID),
                isDisabled:
                    accountID === props.session.accountID ||
                    details.login === props.policy.owner ||
                    policyMember.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE ||
                    !_.isEmpty(policyMember.errors),
                text: props.formatPhoneNumber(PersonalDetailsUtils.getDisplayNameOrDefault(details)),
                alternateText: props.formatPhoneNumber(details.login),
                rightElement: roleBadge,
                icons: [
                    {
                        source: UserUtils.getAvatar(details.avatar, accountID),
                        name: props.formatPhoneNumber(details.login),
                        type: CONST.ICON_TYPE_AVATAR,
                        id: accountID,
                    },
                ],
                errors: policyMember.errors,
                pendingAction: policyMember.pendingAction,

                // Note which secondary login was used to invite this primary login
                invitedSecondaryLogin: invitedPrimaryToSecondaryLogins[details.login] || '',
            });
        });

        result = _.sortBy(result, (value) => value.text.toLowerCase());

        return result;
    };
    const data = getMemberOptions();

    const getHeaderMessage = () => {
        if (isOfflineAndNoMemberDataAvailable) {
            return props.translate('workspace.common.mustBeOnlineToViewMembers');
        }
        return !data.length ? props.translate('workspace.common.memberNotFound') : '';
    };

    const getHeaderContent = () => (
        <>
            <Text style={[styles.pl5, styles.mb5, styles.mt3]}>{props.translate('workspace.people.membersListTitle')}</Text>
            {!_.isEmpty(invitedPrimaryToSecondaryLogins) && (
                <MessagesRow
                    type="success"
                    messages={{0: 'workspace.people.addedWithPrimary'}}
                    containerStyles={[styles.pb5, styles.ph5]}
                    onClose={() => Policy.dismissAddedWithPrimaryLoginMessages(policyID)}
                />
            )}
        </>
    );

    const getCustomListHeader = () => (
        <View style={[styles.flex1, styles.flexRow, styles.justifyContentBetween, StyleUtils.getPaddingLeft(64)]}>
            <View>
                <Text style={styles.searchInputStyle}>{props.translate('common.member')}</Text>
            </View>
            <View style={[StyleUtils.getMinimumWidth(60), styles.mr3]}>
                <Text style={styles.searchInputStyle}>{props.translate('common.role')}</Text>
            </View>
        </View>
    );

    const getHeaderButtons = () => (
        <View style={[styles.w100, styles.flexRow, isSmallScreenWidth && styles.mb3]}>
            <Button
                medium
                success
                onPress={inviteUser}
                text={props.translate('workspace.invite.member')}
                icon={Expensicons.Plus}
                iconStyles={{transform: [{scale: 0.6}]}}
                innerStyles={[isSmallScreenWidth && styles.alignItemsCenter]}
                style={[isSmallScreenWidth && styles.flexGrow1]}
            />
            <Button
                medium
                danger
                style={[styles.ml2, isSmallScreenWidth && styles.w50]}
                isDisabled={selectedEmployees.length === 0}
                text={props.translate('common.remove')}
                onPress={askForConfirmationToRemove}
            />
        </View>
    );

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            style={[styles.defaultModalContainer]}
            testID={WorkspaceMembersPage.displayName}
            shouldShowOfflineIndicatorInWideScreen
        >
            <FullPageNotFoundView
                shouldShow={(_.isEmpty(props.policy) && !props.isLoadingReportData) || !PolicyUtils.isPolicyAdmin(props.policy) || PolicyUtils.isPendingDeletePolicy(props.policy)}
                subtitleKey={_.isEmpty(props.policy) ? undefined : 'workspace.common.notAuthorized'}
                onBackButtonPress={() => Navigation.goBack(ROUTES.SETTINGS_WORKSPACES)}
            >
                <HeaderWithBackButton
                    title={props.translate('workspace.common.members')}
                    icon={Illustrations.ReceiptWrangler}
                    onBackButtonPress={() => {
                        Navigation.goBack();
                    }}
                    shouldShowBackButton={isSmallScreenWidth}
                    guidesCallTaskID={CONST.GUIDES_CALL_TASK_IDS.WORKSPACE_MEMBERS}
                >
                    {!isSmallScreenWidth && getHeaderButtons()}
                </HeaderWithBackButton>
                {isSmallScreenWidth && <View style={[styles.pl5, styles.pr5]}>{getHeaderButtons()}</View>}
                <ConfirmModal
                    danger
                    title={props.translate('workspace.people.removeMembersTitle')}
                    isVisible={removeMembersConfirmModalVisible}
                    onConfirm={removeUsers}
                    onCancel={() => setRemoveMembersConfirmModalVisible(false)}
                    prompt={props.translate('workspace.people.removeMembersPrompt')}
                    confirmText={props.translate('common.remove')}
                    cancelText={props.translate('common.cancel')}
                    onModalHide={() =>
                        InteractionManager.runAfterInteractions(() => {
                            if (!textInputRef.current) {
                                return;
                            }
                            textInputRef.current.focus();
                        })
                    }
                />
                <View style={[styles.w100, styles.flex1]}>
                    <SelectionList
                        canSelectMultiple
                        sections={[{data, indexOffset: 0, isDisabled: false}]}
                        ListItem={TableListItem}
                        disableKeyboardShortcuts={removeMembersConfirmModalVisible}
                        headerMessage={getHeaderMessage()}
                        headerContent={getHeaderContent()}
                        onSelectRow={(item) => toggleUser(item.accountID)}
                        onSelectAll={() => toggleAllUsers(data)}
                        onDismissError={dismissError}
                        showLoadingPlaceholder={!isOfflineAndNoMemberDataAvailable && (!OptionsListUtils.isPersonalDetailsReady(props.personalDetails) || _.isEmpty(props.policyMembers))}
                        showScrollIndicator
                        shouldPreventDefaultFocusOnSelectRow={!DeviceCapabilities.canUseTouchScreen()}
                        inputRef={textInputRef}
                        customListHeader={getCustomListHeader()}
                        listHeaderWrapperStyle={[styles.ph9, styles.pv3, styles.pb5]}
                    />
                </View>
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

WorkspaceMembersPage.propTypes = propTypes;
WorkspaceMembersPage.defaultProps = defaultProps;
WorkspaceMembersPage.displayName = 'WorkspaceMembersPage';

export default compose(
    withLocalize,
    withWindowDimensions,
    withPolicyAndFullscreenLoading,
    withNetwork(),
    withOnyx({
        personalDetails: {
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
        },
        session: {
            key: ONYXKEYS.SESSION,
        },
        isLoadingReportData: {
            key: ONYXKEYS.IS_LOADING_REPORT_DATA,
        },
    }),
    withCurrentUserPersonalDetails,
)(WorkspaceMembersPage);
