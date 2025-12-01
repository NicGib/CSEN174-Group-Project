import { StyleSheet } from 'react-native';

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
    typography: {
        heading: {
            h1: {
                fontFamily: 'InterExtraBold',
                fontSize: 24,
                fontWeight: '800' as const, // "Extra bold"
                lineHeight: 28,
            },
            h2: {
                fontFamily: 'InterExtraBold',
                fontSize: 18,
                fontWeight: '800' as const,
                lineHeight: 22,
            },
            h3: {
                fontFamily: 'InterExtraBold',
                fontSize: 16,
                fontWeight: '800' as const,
                lineHeight: 20,
            },
            h4: {
                fontFamily: 'InterBold',
                fontSize: 14,
                fontWeight: '700' as const, // "Bold"
                lineHeight: 18,
            },
            h5: {
                fontFamily: 'InterBold',
                fontSize: 12,
                fontWeight: '700' as const,
                lineHeight: 16,
            },
        },

        body: {
            xl: {
                fontFamily: 'Inter',
                fontSize: 18,
                fontWeight: '400' as const, // "Regular"
                lineHeight: 24,
            },
            l: {
                fontFamily: 'Inter',
                fontSize: 16,
                fontWeight: '400' as const,
                lineHeight: 22,
            },
            m: {
                fontFamily: 'Inter',
                fontSize: 14,
                fontWeight: '400' as const,
                lineHeight: 18,
            },
            s: {
                fontFamily: 'Inter',
                fontSize: 12,
                fontWeight: '400' as const,
                lineHeight: 16,
            },
            xs: {
                fontFamily: 'Inter',
                fontSize: 10,
                fontWeight: '500' as const, // "Medium"
                lineHeight: 12,
            },
        },

        action: {
            l: {
                fontFamily: 'InterSemiBold',
                fontSize: 14,
                fontWeight: '600' as const, // "Semi Bold"
                lineHeight: 16,
                textTransform: 'uppercase',
            },
            m: {
                fontFamily: 'InterSemiBold',
                fontSize: 12,
                fontWeight: '600' as const,
                lineHeight: 14,
                textTransform: 'uppercase',
            },
            s: {
                fontFamily: 'InterSemiBold',
                fontSize: 10,
                fontWeight: '600' as const,
                lineHeight: 12,
                textTransform: 'uppercase',
            },
        },

        caption: {
            m: {
                fontFamily: 'InterSemiBold',
                fontSize: 10,
                fontWeight: '600' as const, // Semi Bold
                lineHeight: 12,
            },
        },
    },
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
        color: '#FCFAE1',
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
};

export const navColors = {
  light: {
    text: theme.colors.primary.light,
    background: theme.colors.secondary.light,
    tint: theme.colors.primary.dark,
    icon: theme.colors.primary.light,
    tabIconDefault: theme.colors.primary.light,
    tabIconSelected: theme.colors.primary.dark,
  },
  dark: {
    text: theme.colors.secondary.light,
    background: theme.colors.primary.dark,
    tint: theme.colors.secondary.medium,
    icon: theme.colors.secondary.light,
    tabIconDefault: theme.colors.secondary.light,
    tabIconSelected: theme.colors.secondary.medium,
  },
};

// Create StyleSheet for better performance
export const styles = StyleSheet.create({
    
    // Landing page styles
    landingContainer: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    landingTopSection: {
        alignItems: 'center',
    },
    landingTitle: {
        fontSize: 40,
        fontWeight: '700',
        fontFamily: 'InterBold',
        color: theme.colors.secondary.light, //was #FCFAE1
    },
    landingSubtitle: {
        fontSize: 16,
        fontFamily: 'Inter',
        fontWeight: '400',
        color: theme.colors.secondary.medium, //was #ffffff99
        textAlign: 'center',
        marginTop: 8,
    },
    landingButtonSection: {
        alignItems: 'center',
    },
    landingButtonContainer: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        gap: 16,
    },
    landingButton: {
        width: '100%',
    },
    
    // Auth pages styles (sign-up, sign-in)
    authContainer: {
        flex: 1,
        padding: 24,
        // backgroundColor: theme.colors.secondary.light, //was #f5f5f5
    },
    authHeader: {
        alignItems: 'center',
        marginTop: 60,
        marginBottom: 24,
    },
    authTitle: {
        fontSize: theme.typography.heading.h1.fontSize,
        fontWeight: theme.typography.heading.h1.fontWeight,
        fontFamily: theme.typography.heading.h1.fontFamily,
        color: theme.colors.secondary.light,
        marginBottom: 8,
    },
    authSubtitle: {
        fontSize: 16,
        fontFamily: 'Inter',
        fontWeight: '400',
        color: theme.colors.secondary.medium, //was #7f8c8d
        textAlign: 'center',
    },
    authFormLabel: {
        color: theme.colors.secondary.light,
        fontSize: theme.typography.heading.h5.fontSize,
        fontWeight: theme.typography.heading.h5.fontWeight,
        lineHeight: theme.typography.heading.h5.lineHeight,
        fontFamily: theme.typography.heading.h5.fontFamily,
        marginBottom: 8
    },
    authForm: {
        flex: 1,
        /*justifyContent: 'flex-end',*/
    },
    authInput: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        color: theme.colors.secondary.light,
        marginBottom: 8,
        borderColor: theme.colors.secondary.light,
        fontSize: 16,
        fontFamily: 'Inter',
        fontWeight: '400',
    },
    authButtonContainer: {
    },
    authFooterText: {
        color: theme.colors.secondary.medium, //was #7f8c8d
        textAlign: 'center',
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: '400',
        marginBottom: 20,
    },
    
    // Main app home page styles
    homeContainer: {
        flex: 1,
        padding: 24,
        backgroundColor: theme.colors.neutrallight.white, //was #f5f5f5
    },
    homeHeader: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 60,
    },
    homeTitle: {
        fontSize: 32,
        fontWeight: '700',
        fontFamily: 'InterBold',
        color: theme.colors.secondary.light, //was #2c3e50
        marginBottom: 8,
    },
    homeSubtitle: {
        fontSize: 16,
        fontFamily: 'Inter',
        fontWeight: '400',
        color: theme.colors.secondary.medium, //was #7f8c8d
    },
    homeUserInfo: {
        backgroundColor: theme.colors.secondary.light,
        padding: 20,
        borderRadius: 12,
        marginBottom: 30,
        shadowColor: theme.colors.primary.dark,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.4,
        shadowRadius: 3.84,
        elevation: 5,
    },
    homeStatusText: {
        fontSize: 18,
        fontWeight: '600',
        fontFamily: 'InterSemiBold',
        color: theme.colors.primary.dark, //was #27ae60
        marginBottom: 8,
    },
    homeEmailText: {
        fontSize: 16,
        fontFamily: 'Inter',
        fontWeight: '400',
        color: theme.colors.secondary.dark, //was #2c3e50
        marginBottom: 4,
    },
    homeUserIdText: {
        fontSize: 14,
        fontFamily: 'Inter',
        fontWeight: '400',
        color: theme.colors.secondary.medium, //was #7f8c8d
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
        color: theme.colors.neutrallight.gray, //was #808080
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
        paddingVertical: 18,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        backgroundColor: theme.colors.secondary.light, //was #FCFAE1
        shadowColor: theme.colors.primary.dark,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.4,
        shadowRadius: 3.84,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderRadius: 40,
        borderColor: theme.colors.secondary.light, //was #FCFAE1
    },
    primaryButtonText: {
        color: theme.colors.primary.dark, //was #29361B
        fontSize: 16,
        fontFamily: 'InterSemiBold',
        fontWeight: '600',
    },
    secondaryButtonText: {
        color: theme.colors.secondary.light, //was #FCFAE1
        fontSize: 16,
        fontFamily: 'InterSemiBold',
        fontWeight: '600',
    },
    
    // Common styles
    errorText: {
        color: theme.colors.support.error, //was #e74c3c
        textAlign: 'center',
        marginBottom: 10,
        fontSize: 14,
        fontFamily: 'Inter',
        fontWeight: '400',
    },
    loader: {
        marginTop: 20,
    },
});

// Default export to prevent Expo Router from treating this as a route
export default function Theme() {
    return null;
}