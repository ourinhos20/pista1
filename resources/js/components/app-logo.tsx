export default function AppLogo() {
    return (
        <div className="flex w-full items-center">
            <img
                src="/images/pista1-logo.png"
                alt="Pista 1 Mecânica Automotiva"
                className="h-9 w-auto object-contain group-data-[collapsible=icon]:hidden"
            />
            <span className="hidden size-8 place-items-center rounded-lg bg-black text-sm font-black text-[#ee3c3a] italic group-data-[collapsible=icon]:grid">
                P<span className="text-white">1</span>
            </span>
        </div>
    );
}
