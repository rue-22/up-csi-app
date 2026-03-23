<script>
    import { BookCheck, ClipboardList, LayoutDashboard, LogOut, NotebookPen, Users } from '@lucide/svelte';
    import { page } from '$app/state';
    const options = ['Dashboard', 'Signature Sheet', 'Constitution Quiz'];
    const filenames = ['/', '/sigsheet', '/consti-quiz'];
    const adminOptions = ['Constiquiz Responses', 'Sigsheet Progress'];
    const adminFilenames = ['/admin/constiquiz', '/admin/sigsheet'];
    const icon_class = 'h-6 w-6';
    // eslint-disable-next-line prefer-const
    let { user, isNavBarOpen = $bindable(), userRole = null } = $props();
    const linoPlaceholder = '/assets/members/LinoPlaceholder.webp';
</script>

<div class="bg-csi-black fixed z-200 flex h-screen w-screen flex-initial flex-col px-2 pt-24 sm:w-64 sm:px-8 md:pt-24">
    <div class="mx-auto flex max-w-64 justify-start gap-4 pb-8 text-left">
        <img
            src={user.user_metadata.avatar_url ?? linoPlaceholder}
            class="mx-auto h-16 w-16 flex-shrink-0 grow-0 rounded-full object-cover"
            alt="Profile placeholder pic"
        />
        <p class="text-csi-white text-md my-auto font-semibold">{user.user_metadata.full_name}</p>
    </div>

    <div class="flex flex-1 flex-col overflow-y-auto">
        {#each options as option, i (option)}
            <a
                class="my-2 flex w-full"
                href={filenames[i]}
                onclick={() => {
                    isNavBarOpen = false;
                }}
            >
                <div
                    class="text-csi-white flex w-full items-center p-3 font-medium
                        {page.url.pathname !== filenames[i]
                        ? 'hover:bg-csi-neutral-100 hover:text-csi-black rounded-3xl opacity-50 ease-in-out hover:opacity-100 hover:duration-300'
                        : 'font-bold'}"
                >
                    <!-- Options -->
                    {#if option === 'Dashboard'}
                        <LayoutDashboard class={icon_class} />
                    {:else if option === 'Signature Sheet'}
                        <NotebookPen class={icon_class} />
                    {:else}
                        <BookCheck class={icon_class} />
                    {/if}
                    <div class="ml-4 w-3/4">{option}</div>
                </div>
            </a>
        {/each}

        {#if userRole === 'admin'}
            <div class="border-csi-neutral-900 mx-3 mt-4 border-t pt-4">
                <span class="text-csi-neutral-400 mb-2 block px-3 text-xs font-semibold tracking-wider uppercase">
                    Admin
                </span>
            </div>
            {#each adminOptions as option, i (option)}
                <a
                    class="my-2 flex w-full"
                    href={adminFilenames[i]}
                    onclick={() => {
                        isNavBarOpen = false;
                    }}
                >
                    <div
                        class="text-csi-white flex w-full items-center p-3 font-medium
                            {page.url.pathname !== adminFilenames[i]
                            ? 'hover:bg-csi-neutral-100 hover:text-csi-black rounded-3xl opacity-50 ease-in-out hover:opacity-100 hover:duration-300'
                            : 'font-bold'}"
                    >
                        {#if option === 'Constiquiz Responses'}
                            <ClipboardList class={icon_class} />
                        {:else}
                            <Users class={icon_class} />
                        {/if}
                        <div class="ml-4 w-3/4">{option}</div>
                    </div>
                </a>
            {/each}
        {/if}
    </div>

    <form class="mt-auto mb-10" action="/logout" method="POST">
        <div
            class="text-csi-white hover:bg-csi-neutral-100 hover:text-csi-black flex w-full cursor-pointer gap-2 rounded-full p-3 font-medium
                        opacity-50 ease-in-out hover:font-medium hover:opacity-100 hover:duration-100"
        >
            <LogOut class={icon_class} />
            <button type="submit" class="w-3/4 cursor-pointer">Log Out</button>
        </div>
    </form>
</div>
