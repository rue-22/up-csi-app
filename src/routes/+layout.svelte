<script lang="ts">
    import './app.css';
    import { applicant_names_list, filledSigsheet, gdrive_folder_id, members, username, uuid } from '$lib/shared';
    import CSI_Logo from '$lib/icons/upcsi.svg';
    import HAM_MENU from '$lib/icons/ham_menu.svg';
    import NavBar from '$lib/NavBar.svelte';
    import { page } from '$app/state';

    import { invalidate } from '$app/navigation';
    import { logger } from '$lib/logger';
    import { onMount } from 'svelte';

    const { data, children } = $props();
    const { session, supabase } = $derived(data);

    // Sync $lib variables to data props (must be synchronous so children can read in onMount)
    if (data?.uuid) uuid.set(data.uuid);
    if (data?.user?.user_metadata.full_name) username.set(data.user.user_metadata.full_name);
    if (data?.filledSigsheet) filledSigsheet.set(data.filledSigsheet);
    if (data?.gdrive_folder_id) gdrive_folder_id.set(data.gdrive_folder_id);

    let isNavBarOpen = $state(false);
    onMount(() => {
        const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
            if (newSession?.expires_at !== session?.expires_at) {
                invalidate('supabase:auth');
            }
        });
        return () => data.subscription.unsubscribe();
    });

    // Get applicant_names_list
    onMount(async () => {
        const { data: app_data, error: app_error } = await supabase.from('profiles').select('full_name');
        if (app_error) {
            logger.error('Error fetching profile names: ', app_error);
        } else if (app_data) {
            applicant_names_list.set(app_data.map(row => row.full_name));
        }
    });

    // Get members list
    onMount(async () => {
        console.log('Fetching members list.');
        const { data: members_data, error: members_error } = await supabase
            .from('members')
            .select('member_id, member_name, member_committee, role, photo');
        if (members_error) {
            console.error('Error fetching members: ', members_error);
        } else if (members_data) {
            members.set(members_data);
        }
    });
</script>

{#if !data.session}
    {@render children()}
{:else}
    <header class="bg-csi-black sticky top-0 z-100 flex w-full items-center px-16 py-4">
        <button
            class="cursor-pointer"
            onclick={() => {
                isNavBarOpen = !isNavBarOpen;
            }}
        >
            <img src={HAM_MENU} alt="Ham Menu" />
        </button>

        <div class="flex flex-grow items-center justify-center">
            <img src={CSI_Logo} class="mr-4 w-6" alt="UP CSI LOGO" />
            <div class="text-csi-blue align-middle text-2xl font-semibold">UP CSI</div>
        </div>

        <!-- light/dark switch -->
        <div></div>
    </header>

    <div class="flex w-full flex-row bg-[#161619]">
        {#if page.url.pathname !== '/login/'}
            <!-- Backdrop overlay -->
            <div
                class="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300
                    {isNavBarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}"
                role="button"
                tabindex="-1"
                onclick={() => (isNavBarOpen = false)}
                onkeydown={e => {
                    if (e.key === 'Escape') isNavBarOpen = false;
                }}
            ></div>
            <!-- Sidebar -->
            <div
                class="fixed top-0 left-0 z-50 h-screen w-64 transition-transform duration-300 ease-in-out
                    {isNavBarOpen ? 'translate-x-0' : '-translate-x-full'}"
            >
                <NavBar user={data.user} bind:isNavBarOpen userRole={data.userRole} />
            </div>
        {/if}

        <div class="flex w-full justify-center">
            {@render children()}
        </div>
    </div>
{/if}
