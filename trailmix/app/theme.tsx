import { StyleSheet } from 'react-native';
// Typography definitions - centralized for better performance and maintainability
export const typography = {
    // Headings
    headingH1: {
        fontSize: 24,
        fontWeight: '800' as const,
        lineHeight: 28,
    },
    headingH2: {
        fontSize: 18,
        fontWeight: '800' as const,
        lineHeight: 22,
    },
    headingH3: {
        fontSize: 16,
        fontWeight: '800' as const,
        lineHeight: 20,
    },
    headingH4: {
        fontSize: 14,
        fontWeight: '700' as const,
        lineHeight: 18,
    },
    headingH5: {
        fontSize: 12,
        fontWeight: '700' as const,
        lineHeight: 16,
    },

    // Body text
    bodyXL: {
        fontSize: 18,
        fontWeight: '400' as const,
        lineHeight: 24,
    },
    bodyL: {
        fontSize: 16,
        fontWeight: '400' as const,
        lineHeight: 22,
    },
    bodyM: {
        fontSize: 14,
        fontWeight: '400' as const,
        lineHeight: 18,
    },
    bodyS: {
        fontSize: 12,
        fontWeight: '400' as const,
        lineHeight: 16,
    },
    bodyXS: {
        fontSize: 10,
        fontWeight: '500' as const,
        lineHeight: 12,
    },

    // Action text (buttons, links)
    actionL: {
        fontSize: 14,
        fontWeight: '600' as const,
        lineHeight: 16,
        textTransform: 'uppercase' as const,
    },
    actionM: {
        fontSize: 12,
        fontWeight: '600' as const,
        lineHeight: 14,
        textTransform: 'uppercase' as const,
    },
    actionS: {
        fontSize: 10,
        fontWeight: '600' as const,
        lineHeight: 12,
        textTransform: 'uppercase' as const,
    },

    // Caption text
    captionM: {
        fontSize: 10,
        fontWeight: '600' as const,
        lineHeight: 12,
    },
};

// Helper function to easily apply typography styles
export const getTextStyle = (variant: keyof typeof typography, additionalStyles?: any) => ({
    ...typography[variant],
    ...additionalStyles,
});

export const theme = {
    colors: {
        primary: {
            dark: '#29361B',
            medium: '#455429',
            light: '#617337',
        },
        secondary: {
            dark: '#BB6C29',
            medium: '#DEA15E',
            light: '#FCFAE1',
        },
        gradient: {
            lightgreen: ['#617337', '#455429'] as const,
            darkgreen: ['#455429', '#29361B'] as const,
            lightbrown: ['#FCFAE1', '#DEA15E'] as const,
            darkbrown: ['#DEA15E', '#BB6C29'] as const,
        },
        neutrallight: {
            white: '#FFFFFF',
            lightgray: '#E4E3E4',
            gray: '#C8C7C8',
        },
        neutraldark: {
            light: '#918F90',
            medium: '#5A5758',
            black: '#231F20',
        },
        support: {
            success: '#3186A3',
            warning: '#D76600',
            error: '#BC2B18',
        },
    },
    // Typography is now defined in the StyleSheet below for better performance
    container: {
        flex: 1,
        padding: 24,
        backgroundColor: '#f5f5f5',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 60,
    },
    title: {
        fontSize: 48,
        fontWeight: '800',
        color: 'theme.colors.secondary.light',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
    },
    form: {
        flex: 1,
        justifyContent: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#bdc3c7',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        backgroundColor: 'white',
        fontSize: 16,
    },
    buttonContainer: {
        gap: 10,
        marginTop: 20,
    },
    errorText: {
        color: '#e74c3c',
        textAlign: 'center',
        marginBottom: 10,
        fontSize: 14,
    },
    loader: {
        marginTop: 20,
    },
    footerText: {
        color: '#7f8c8d',
        textAlign: 'center',
        fontSize: 12,
        marginBottom: 20,
    },
    // Landing page styles
    landing: {
        container: {
            flex: 1,
            paddingHorizontal: 24,
            paddingTop: 60,
            paddingBottom: 40,
            flexDirection: 'column',
            justifyContent: 'space-between',
        },
        topSection: {
            alignItems: 'center',
        },
        title: {
            fontSize: 40,
            fontWeight: '700',
            color: '#FCFAE1',
        },
        subtitle: {
            fontSize: 16,
            color: '#ffffff99',
            textAlign: 'center',
            marginTop: 8,
        },
        buttonSection: {
            alignItems: 'center',
        },
        buttonContainer: {
            width: '100%',
            maxWidth: 400,
            alignSelf: 'center',
            gap: 16,
        },
        landingButton: {
            width: '100%',
        },
    },
    // Button styles
    buttons: {
        baseButton: {
            borderRadius: 40,
            paddingVertical: 18,
            paddingHorizontal: 24,
            alignItems: 'center',
            justifyContent: 'center',
        },
        primaryButton: {
            backgroundColor: '#FCFAE1',
        },
        secondaryButton: {
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: '#FCFAE1',
        },
        primaryButtonText: {
            color: '#29361B',
            fontSize: 16,
            fontWeight: '600',
        },
        secondaryButtonText: {
            color: '#FCFAE1',
            fontSize: 16,
            fontWeight: '600',
        },
    },
}

// Create StyleSheet for better performance
export const styles = StyleSheet.create({
    // Landing page styles
    landingContainer: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
        flexDirection: 'column',
    },
    landingTopSection: {
        alignItems: 'center',
    },
    landingTitle: {
        fontSize: 40,
        fontWeight: '700',
        color: '#FCFAE1',
    },
    landingSubtitle: {
        fontSize: 16,
        color: '#ffffff99',
        textAlign: 'center',
        marginTop: 8,
    },
    landingButtonSection: {
        alignItems: 'center',
        marginTop: 'auto',
    },
    landingButtonContainer: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        gap: 12,
    },
    landingButton: {
        width: '100%',
    },

    // Auth pages styles (sign-up, sign-in)
    authContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 32,
        paddingBottom: 32,
        flexDirection: 'column',
    },
    authHeader: {
        alignItems: 'flex-start',
        marginTop: 20,
        marginBottom: 16,
    },
    authTitle: {
        ...typography.headingH1,
        color: theme.colors.secondary.light,
        marginBottom: 4,
    },
    authSubtitle: {
        ...typography.bodyS,
        color: theme.colors.secondary.light,
        textAlign: 'left',
    },
    authFormLabel: {
        ...typography.headingH5,
        color: theme.colors.secondary.light,
        marginBottom: 4
    },
    authForm: {
        width: '100%',
        flex: 1,
    },

    // Keyboard handling styles
    keyboardContainer: {
        flex: 1,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'space-between',
        paddingBottom: 20,
    },
    authInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        height: 48,
        color: theme.colors.secondary.light,
        marginBottom: 8,
        borderColor: theme.colors.secondary.light,
        textAlignVertical: 'center',
        ...typography.bodyL,
    },
    authButtonContainer: {
        marginTop: 28,
        alignItems: 'center',
    },
    authFooterText: {
        ...typography.bodyS,
        color: '#7f8c8d',
        textAlign: 'center',
        // marginTop: 16,
    },

    // Main app home page styles
    homeContainer: {
        flex: 1,
        padding: 24,
        backgroundColor: '#f5f5f5',
    },
    homeHeader: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 60,
    },
    homeTitle: {
        ...typography.headingH2,
        fontSize: 28,
        color: '#2c3e50',
        marginBottom: 8,
    },
    homeSubtitle: {
        ...typography.bodyL,
        color: '#7f8c8d',
    },
    homeUserInfo: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    homeStatusText: {
        ...typography.bodyXL,
        fontWeight: '600',
        color: '#27ae60',
        marginBottom: 8,
    },
    homeEmailText: {
        ...typography.bodyL,
        color: '#2c3e50',
        marginBottom: 4,
    },
    homeUserIdText: {
        ...typography.bodyM,
        color: '#7f8c8d',
    },
    homeActions: {
        marginTop: 'auto',
    },

    // Modal styles
    modalContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modalLink: {
        marginTop: 15,
        paddingVertical: 15,
    },

    // Explore page styles
    exploreHeaderImage: {
        color: '#808080',
        bottom: -90,
        left: -35,
        position: 'absolute',
    },
    exploreTitleContainer: {
        flexDirection: 'row',
        gap: 8,
    },

    // Index page styles
    indexTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    indexStepContainer: {
        gap: 8,
        marginBottom: 8,
    },
    indexReactLogo: {
        height: 178,
        width: 290,
        bottom: 0,
        left: 0,
        position: 'absolute',
    },

    // Button styles
    baseButton: {
        borderRadius: 40,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        backgroundColor: '#FCFAE1',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#FCFAE1',
    },
    primaryButtonText: {
        ...typography.bodyL,
        color: '#29361B',
        fontWeight: '600',
    },
    secondaryButtonText: {
        ...typography.bodyL,
        color: '#FCFAE1',
        fontWeight: '600',
    },

    // Common styles
    errorText: {
        ...typography.bodyM,
        color: '#e74c3c',
        textAlign: 'center',
        marginBottom: 10,
    },
    loader: {
        marginTop: 20,
    },
});