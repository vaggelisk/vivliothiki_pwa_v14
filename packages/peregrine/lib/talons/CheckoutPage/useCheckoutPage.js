import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
    useApolloClient,
    useLazyQuery,
    useMutation,
    useQuery,
    gql
} from '@apollo/client';
import { useEventingContext } from '../../context/eventing';

import { useHistory } from 'react-router-dom';

import { useUserContext } from '../../context/user';
import { useCartContext } from '../../context/cart';

import mergeOperations from '../../util/shallowMerge';

import DEFAULT_OPERATIONS from './checkoutPage.gql.js';

import CheckoutError from './CheckoutError';
import { useGoogleReCaptcha } from '../../hooks/useGoogleReCaptcha';

// Define the SetBillingAddressOnCart mutation
const SET_BILLING_ADDRESS_ON_CART = gql`
    mutation SetBillingAddressOnCart($cartId: String!, $sameAsShipping: Boolean!) {
        setBillingAddressOnCart(
            input: {
                cart_id: $cartId
                billing_address: { same_as_shipping: $sameAsShipping }
            }
        ) {
            cart {
                email
                id
                is_virtual
                total_quantity
                total_summary_quantity_including_config
            }
        }
    }
`;

// Define the SetPaymentMethodAndPlaceOrder mutation
const SET_PAYMENT_METHOD_AND_PLACE_ORDER = gql`
    mutation SetPaymentMethodAndPlaceOrder($cartId: String!, $paymentCode: String!) {
        setPaymentMethodAndPlaceOrder(
            input: {
                cart_id: $cartId
                payment_method: { code: $paymentCode }
            }
        ) {
            order {
                order_id
                order_number
            }
        }
    }
`;

// Define the createEmptyCart mutation
const CREATE_EMPTY_CART = gql`
    mutation CreateEmptyCart {
        createEmptyCart
    }
`;

export const CHECKOUT_STEP = {
    SHIPPING_ADDRESS: 1,
    SHIPPING_METHOD: 2,
    PAYMENT: 3,
    REVIEW: 4
};

/**
 *
 * @param {DocumentNode} props.operations.getCheckoutDetailsQuery query to fetch checkout details
 * @param {DocumentNode} props.operations.getCustomerQuery query to fetch customer details
 * @param {DocumentNode} props.operations.getOrderDetailsQuery query to fetch order details
 * @param {DocumentNode} props.operations.createCartMutation mutation to create a new cart
 * @param {DocumentNode} props.operations.placeOrderMutation mutation to place order
 *
 * @returns {
 *  activeContent: String,
 *  availablePaymentMethods: Array,
 *  cartItems: Array,
 *  checkoutStep: Number,
 *  customer: Object,
 *  error: ApolloError,
 *  handlePlaceOrder: Function,
 *  handlePlaceOrderEnterKeyPress: Function,
 *  hasError: Boolean,
 *  isCartEmpty: Boolean,
 *  isGuestCheckout: Boolean,
 *  isLoading: Boolean,
 *  isUpdating: Boolean,
 *  orderDetailsData: Object,
 *  orderDetailsLoading: Boolean,
 *  orderNumber: String,
 *  placeOrderLoading: Boolean,
 *  setCheckoutStep: Function,
 *  setIsUpdating: Function,
 *  setShippingInformationDone: Function,
 *  setShippingMethodDone: Function,
 *  setPaymentInformationDone: Function,
 *  scrollShippingInformationIntoView: Function,
 *  shippingInformationRef: ReactRef,
 *  shippingMethodRef: ReactRef,
 *  scrollShippingMethodIntoView: Function,
 *  resetReviewOrderButtonClicked: Function,
 *  handleReviewOrder: Function,
 *  handleReviewOrderEnterKeyPress: Function,
 *  reviewOrderButtonClicked: Boolean,
 *  toggleAddressBookContent: Function,
 *  toggleSignInContent: Function,
 * }
 */
export const useCheckoutPage = (props = {}) => {
    const history = useHistory();
    const { setCartId } = useCartContext();
    const operations = mergeOperations(DEFAULT_OPERATIONS, props.operations);
    const {
        createCartMutation,
        getCheckoutDetailsQuery,
        getCustomerQuery,
        getOrderDetailsQuery
    } = operations;

     // Add a state variable for orderNumber
     const [orderNumber, setOrderNumber] = useState(null);
      // Add a state variable for orderNumber
    const [placeOrderLoading, setPlaceOrderLoading] = useState(false);

    const [createEmptyCartMutation] = useMutation(CREATE_EMPTY_CART);


    const { generateReCaptchaData, recaptchaWidgetProps } = useGoogleReCaptcha({
        currentForm: 'PLACE_ORDER',
        formAction: 'placeOrder'
    });

    const [reviewOrderButtonClicked, setReviewOrderButtonClicked] = useState(
        false
    );

    const shippingInformationRef = useRef();
    const shippingMethodRef = useRef();

    const apolloClient = useApolloClient();
    const [isUpdating, setIsUpdating] = useState(false);
    const [placeOrderButtonClicked, setPlaceOrderButtonClicked] = useState(
        false
    );
    const [activeContent, setActiveContent] = useState('checkout');
    const [checkoutStep, setCheckoutStep] = useState(
        CHECKOUT_STEP.SHIPPING_ADDRESS
    );
    const [guestSignInUsername, setGuestSignInUsername] = useState('');

    const [{ isSignedIn }] = useUserContext();
    const [{ cartId }, { createCart, removeCart }] = useCartContext();

    const [fetchCartId] = useMutation(createCartMutation);

    const [
        getOrderDetails,
        { data: orderDetailsData, loading: orderDetailsLoading }
    ] = useLazyQuery(getOrderDetailsQuery, {
        // We use this query to fetch details _just_ before submission, so we
        // want to make sure it is fresh. We also don't want to cache this data
        // because it may contain PII.
        fetchPolicy: 'no-cache'
    });

    const { data: customerData, loading: customerLoading } = useQuery(
        getCustomerQuery,
        { skip: !isSignedIn }
    );

    const {
        data: checkoutData,
        networkStatus: checkoutQueryNetworkStatus
    } = useQuery(getCheckoutDetailsQuery, {
        /**
         * Skip fetching checkout details if the `cartId`
         * is a falsy value.
         */
        skip: !cartId,
        notifyOnNetworkStatusChange: true,
        variables: {
            cartId
        }
    });

    const cartItems = useMemo(() => {
        return (checkoutData && checkoutData?.cart?.items) || [];
    }, [checkoutData]);

    /**
     * For more info about network statues check this out
     *
     * https://www.apollographql.com/docs/react/data/queries/#inspecting-loading-states
     */
    const isLoading = useMemo(() => {
        const checkoutQueryInFlight = checkoutQueryNetworkStatus
            ? checkoutQueryNetworkStatus < 7
            : true;

        return checkoutQueryInFlight || customerLoading;
    }, [checkoutQueryNetworkStatus, customerLoading]);

    const customer = customerData && customerData.customer;

    const toggleAddressBookContent = useCallback(() => {
        setActiveContent(currentlyActive =>
            currentlyActive === 'checkout' ? 'addressBook' : 'checkout'
        );
    }, []);
    const toggleSignInContent = useCallback(() => {
        setActiveContent(currentlyActive =>
            currentlyActive === 'checkout' ? 'signIn' : 'checkout'
        );
    }, []);

    const checkoutError = useMemo(() => {
        if (placeOrderButtonClicked) {
            return new CheckoutError('Error placing order');
        }
    }, [placeOrderButtonClicked]);

    const handleReviewOrder = useCallback(() => {
        setReviewOrderButtonClicked(true);
    }, []);

    const handleReviewOrderEnterKeyPress = useCallback(() => {
        event => {
            if (event.key === 'Enter') {
                handleReviewOrder();
            }
        };
    }, [handleReviewOrder]);

    const resetReviewOrderButtonClicked = useCallback(() => {
        setReviewOrderButtonClicked(false);
    }, []);

    const scrollShippingInformationIntoView = useCallback(() => {
        if (shippingInformationRef.current) {
            shippingInformationRef.current.scrollIntoView({
                behavior: 'smooth'
            });
        }
    }, [shippingInformationRef]);

    const setShippingInformationDone = useCallback(() => {
        if (checkoutStep === CHECKOUT_STEP.SHIPPING_ADDRESS) {
            setCheckoutStep(CHECKOUT_STEP.SHIPPING_METHOD);
        }
    }, [checkoutStep]);

    const scrollShippingMethodIntoView = useCallback(() => {
        if (shippingMethodRef.current) {
            shippingMethodRef.current.scrollIntoView({
                behavior: 'smooth'
            });
        }
    }, [shippingMethodRef]);

    const setShippingMethodDone = useCallback(() => {
        if (checkoutStep === CHECKOUT_STEP.SHIPPING_METHOD) {
            setCheckoutStep(CHECKOUT_STEP.PAYMENT);
        }
    }, [checkoutStep]);

    const setPaymentInformationDone = useCallback(() => {
        if (checkoutStep === CHECKOUT_STEP.PAYMENT) {
            globalThis.scrollTo({
                left: 0,
                top: 0,
                behavior: 'smooth'
            });
            setCheckoutStep(CHECKOUT_STEP.REVIEW);
        }
    }, [checkoutStep]);

    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    // Define the mutations
    const [setBillingAddressOnCart, { loading: billingLoading, error: billingError }] =
        useMutation(SET_BILLING_ADDRESS_ON_CART);

    const [setPaymentMethodAndPlaceOrder, { loading: paymentLoading, error: paymentError }] =
        useMutation(SET_PAYMENT_METHOD_AND_PLACE_ORDER);

    const handlePlaceOrder = useCallback(async () => {
        try {
            // Step 1: Set billing address
            console.log('ΑΑΑΑΑΑΑΑΑ Placing order for cart ID:', cartId);  
            const billingResponse = await setBillingAddressOnCart({
                variables: {
                    cartId,
                    sameAsShipping: true
                }
            });

            if (!billingResponse?.data?.setBillingAddressOnCart) {
                throw new Error('Failed to set billing address.');
            }

            // Step 2: Set payment method and place order/
            const paymentResponse = await setPaymentMethodAndPlaceOrder({
                variables: {
                    cartId,
                    paymentCode: 'cashondelivery' // Replace with the desired payment method code
                }
            });

            if (!paymentResponse?.data?.setPaymentMethodAndPlaceOrder) {
                throw new Error('Failed to place order.');
            }

            // Extract the orderNumber from the response
            const order = paymentResponse.data.setPaymentMethodAndPlaceOrder.order;
            setOrderNumber(order.order_number); // Update the state with the order number

            // Dispatch the success action
            console.log('Dispatching USER/SET_USER_ON_ORDER_SUCCESS');
            dispatch({ type: 'USER/SET_USER_ON_ORDER_SUCCESS', payload: { order } });

            // Order placed successfully
            console.log('Order placed:', paymentResponse.data.setPaymentMethodAndPlaceOrder);

            // Redirect to order-confirmation BEFORE clearing cart
            history.push('/order-confirmation', {
                orderNumber: order.order_number,
                items: checkoutData?.cart?.items || []
            });
            
            // 1) Clear old cart data properly
            await removeCart();
            await apolloClient.clearCacheData(apolloClient, 'cart');

            // 2) Create a new empty cart the PWA Studio way
            await createCart({ fetchCartId });




        } catch (error) {
            console.error('Error placing order:', error);
        } finally {
            // setIsPlacingOrder(false);
            
        }
    }, [cartId, setBillingAddressOnCart, setPaymentMethodAndPlaceOrder]);

    const handlePlaceOrderEnterKeyPress = useCallback(() => {
        event => {
            if (event.key === 'Enter') {
                handlePlaceOrder();
            }
        };
    }, [handlePlaceOrder]);

    const [, { dispatch }] = useEventingContext();

    // Go back to checkout if shopper logs in
    useEffect(() => {
        if (isSignedIn) {
            setActiveContent('checkout');
        }
    }, [isSignedIn]);

    useEffect(() => {
        if (
            checkoutStep === CHECKOUT_STEP.SHIPPING_ADDRESS &&
            cartItems.length
        ) {
            dispatch({
                type: 'CHECKOUT_PAGE_VIEW',
                payload: {
                    cart_id: cartId,
                    products: cartItems
                }
            });
        } else if (reviewOrderButtonClicked) {
            dispatch({
                type: 'CHECKOUT_REVIEW_BUTTON_CLICKED',
                payload: {
                    cart_id: cartId
                }
            });
        }
    }, [
        cartId,
        checkoutStep,
        cartItems,
        dispatch,
        reviewOrderButtonClicked
    ]);

    useEffect(() => {
        if (isSignedIn && placeOrderButtonClicked) {
            history.push('/order-confirmation', {
                items: cartItems
            });
        } else if (!isSignedIn && placeOrderButtonClicked) {
            history.push('/checkout');
        }
    }, [isSignedIn, placeOrderButtonClicked, cartItems, history]);

    return {
        activeContent,
        availablePaymentMethods: checkoutData
            ? checkoutData?.cart?.available_payment_methods
            : null,
        cartItems,
        checkoutStep,
        customer,
        error: checkoutError,
        guestSignInUsername,
        handlePlaceOrder,
        handlePlaceOrderEnterKeyPress,
        hasError: !!checkoutError,
        isCartEmpty: !(checkoutData && checkoutData?.cart?.total_quantity),
        isGuestCheckout: !isSignedIn,
        isLoading,
        isUpdating,
        orderDetailsData,
        orderDetailsLoading,
        orderNumber,
        placeOrderLoading,
        placeOrderButtonClicked,
        setCheckoutStep,
        setGuestSignInUsername,
        setIsUpdating,
        setShippingInformationDone,
        setShippingMethodDone,
        setPaymentInformationDone,
        scrollShippingInformationIntoView,
        shippingInformationRef,
        shippingMethodRef,
        scrollShippingMethodIntoView,
        resetReviewOrderButtonClicked,
        handleReviewOrder,
        handleReviewOrderEnterKeyPress,
        reviewOrderButtonClicked,
        recaptchaWidgetProps,
        toggleAddressBookContent,
        toggleSignInContent
    };
};
